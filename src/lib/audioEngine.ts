/**
 * audioEngine.ts
 *
 * A lightweight imperative wrapper around a single <audio> element.
 * Responsibilities:
 * - Manage loading a track (by URL) & playback controls.
 * - Emit typed events (observer pattern) to outside React layer.
 * - Provide current position & buffered info via RAF + media events.
 *
 * It does NOT:
 * - Decide what the next track is.
 * - Hold the global player queue (playerState.ts does that).
 *
 * Integration Plan:
 * - A binding hook (e.g. useAudioEngineBinding) will subscribe to
 *   PlayerState (currentTrackId, status, volume, seek intents) and
 *   dispatch back position/duration/buffered/status updates.
 */

export type AudioEngineEvents =
  | "ready" // metadata loaded (duration known)
  | "canplay" // can begin playback
  | "play"
  | "pause"
  | "ended"
  | "time"
  | "buffer"
  | "error"
  | "loading"; // src set, waiting for metadata

export interface AudioEngineEventMap {
  ready: { duration: number };
  canplay: Record<string, never>;
  play: Record<string, never>;
  pause: Record<string, never>;
  ended: Record<string, never>;
  time: { position: number; duration: number };
  buffer: { buffered: number };
  error: { message: string; code?: string };
  loading: Record<string, never>;
}

type Listener<T extends AudioEngineEvents> = (
  payload: AudioEngineEventMap[T]
) => void;

interface LoadOptions {
  autoplay?: boolean;
  /**
   * Start playback at a given position (in seconds) after metadata.
   */
  startPosition?: number;
}

export class AudioEngine {
  private audio: HTMLAudioElement;
  private listeners: { [K in AudioEngineEvents]: Set<Listener<K>> };
  private rafId: number | null = null;
  private monitoring = false;
  private lastEmittedTime = -1;

  constructor() {
    this.audio = document.createElement("audio");
    this.audio.preload = "metadata";
    this.audio.crossOrigin = "anonymous"; // allows use of remote CORS audio if permitted

    this.listeners = {
      ready: new Set(),
      canplay: new Set(),
      play: new Set(),
      pause: new Set(),
      ended: new Set(),
      time: new Set(),
      buffer: new Set(),
      error: new Set(),
      loading: new Set(),
    };

    this.bindElementEvents();
  }

  /* ---------- Public API ---------- */

  get element(): HTMLAudioElement {
    return this.audio;
  }

  /**
   * Load a new audio source.
   * Automatically pauses the current playback before switching source.
   */
  load(src: string, opts: LoadOptions = {}): void {
    // Stop RAF updates while source changes
    this.stopMonitoring();
    this.audio.pause();
    this.emit("loading", {});
    this.audio.src = src;
    this.audio.load();
    // Optionally attempt autoplay after canplay or ready
    if (opts.autoplay) {
      this.audio.play().catch(() => {
        // Autoplay might be blocked; we'll rely on user gesture later.
      });
    }
    if (typeof opts.startPosition === "number") {
      const pos = opts.startPosition;
      const setStart = () => {
        try {
          this.audio.currentTime = pos;
        } catch {
          /* ignore if not seekable yet */
        }
      };
      // Set immediately (may fail) & schedule after metadata
      setStart();
      const onceReady = () => {
        setStart();
        this.audio.removeEventListener("loadedmetadata", onceReady);
      };
      this.audio.addEventListener("loadedmetadata", onceReady);
    }
  }

  play(): Promise<void> {
    return this.audio.play().then(() => {
      this.startMonitoring();
    });
  }

  pause(): void {
    this.audio.pause();
    this.stopMonitoring();
  }

  toggle(): void {
    if (this.audio.paused) {
      void this.play();
    } else {
      this.pause();
    }
  }

  seek(seconds: number): void {
    try {
      this.audio.currentTime = Math.max(
        0,
        Math.min(seconds, this.audio.duration || seconds)
      );
      this.emitTime(true);
    } catch {
      /* ignore */
    }
  }

  setVolume(v: number): void {
    this.audio.volume = Math.min(1, Math.max(0, v));
  }

  setMuted(muted: boolean): void {
    this.audio.muted = muted;
  }

  getDuration(): number {
    return isFinite(this.audio.duration) ? this.audio.duration : 0;
  }

  getPosition(): number {
    return this.audio.currentTime || 0;
  }

  getBufferedEnd(): number {
    const { buffered } = this.audio;
    if (!buffered || buffered.length === 0) return 0;
    // Find largest end time
    let end = 0;
    for (let i = 0; i < buffered.length; i++) {
      const e = buffered.end(i);
      if (e > end) end = e;
    }
    return end;
  }

  destroy(): void {
    this.stopMonitoring();
    this.audio.src = "";
    (Object.keys(this.listeners) as AudioEngineEvents[]).forEach((k) => {
      this.listeners[k].clear();
    });
  }

  /* ---------- Event Subscription ---------- */

  on<T extends AudioEngineEvents>(evt: T, fn: Listener<T>): () => void {
    this.listeners[evt].add(fn as any);
    return () => {
      this.listeners[evt].delete(fn as any);
    };
  }

  once<T extends AudioEngineEvents>(evt: T, fn: Listener<T>): () => void {
    const off = this.on(evt, (payload: any) => {
      off();
      fn(payload);
    });
    return off;
  }

  private emit<T extends AudioEngineEvents>(
    evt: T,
    payload: AudioEngineEventMap[T]
  ) {
    for (const fn of this.listeners[evt]) {
      try {
        fn(payload as any);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[AudioEngine listener error]", err);
      }
    }
  }

  /* ---------- Internal Element Event Binding ---------- */

  private bindElementEvents() {
    this.audio.addEventListener("loadedmetadata", () => {
      this.emit("ready", { duration: this.getDuration() });
    });

    this.audio.addEventListener("canplay", () => {
      this.emit("canplay", {});
    });

    this.audio.addEventListener("play", () => {
      this.emit("play", {});
      this.startMonitoring();
    });

    this.audio.addEventListener("pause", () => {
      this.emit("pause", {});
      this.stopMonitoring();
      // Still emit a final time update (some UIs want immediate freeze)
      this.emitTime(true);
    });

    this.audio.addEventListener("ended", () => {
      this.emit("ended", {});
      this.stopMonitoring();
    });

    this.audio.addEventListener("error", () => {
      const mediaError = this.audio.error;
      const codeMap: Record<number, string> = {
        1: "aborted",
        2: "network",
        3: "decode",
        4: "src-not-supported",
      };
      const code = mediaError ? codeMap[mediaError.code] : undefined;
      this.emit("error", {
        message: mediaError?.message || "Audio playback error",
        code,
      });
    });

    this.audio.addEventListener("progress", () => {
      this.emit("buffer", { buffered: this.getBufferedEnd() });
    });

    // Safeguard: if timeupdate events are wanted without RAF, could add:
    // this.audio.addEventListener('timeupdate', () => this.emitTime(false));
  }

  /* ---------- Time Monitoring (RAF) ---------- */

  private startMonitoring() {
    if (this.monitoring) return;
    this.monitoring = true;
    const loop = () => {
      if (!this.monitoring) return;
      this.emitTime(false);
      this.rafId = window.requestAnimationFrame(loop);
    };
    this.rafId = window.requestAnimationFrame(loop);
  }

  private stopMonitoring() {
    this.monitoring = false;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private emitTime(force: boolean) {
    const position = this.getPosition();
    if (!force && Math.abs(position - this.lastEmittedTime) < 0.15) {
      return;
    }
    this.lastEmittedTime = position;
    this.emit("time", {
      position,
      duration: this.getDuration(),
    });
  }
}

/* ---------- Singleton Export ---------- */
/**
 * For most apps a single hidden audio element is sufficient.
 * If you later need multiple, you can refactor callers to create instances.
 */
export const audioEngine = new AudioEngine();

/* ---------- Convenience Factory (optional multiple engines) ---------- */
export function createAudioEngine(): AudioEngine {
  return new AudioEngine();
}

/**
 * Example (future) binding usage:
 *
 * import { audioEngine } from '@/lib/audioEngine';
 * import { useEffect } from 'react';
 * import { usePlayer } from '@/state/playerState';
 *
 * function useAudioEngineBinding() {
 *   const { state, dispatch } = usePlayer();
 *
 *   // Load track when currentTrackId changes
 *   useEffect(() => {
 *     const track = state.queue.find(t => t.id === state.currentTrackId);
 *     if (track) {
 *       audioEngine.load(track.src, { autoplay: state.status === 'playing' });
 *     }
 *   }, [state.currentTrackId, state.status, state.queue]);
 *
 *   // Listen to engine events
 *   useEffect(() => {
 *     const offTime = audioEngine.on('time', ({ position, duration }) => {
 *       dispatch({ type: 'SET_POSITION', position });
 *       if (duration && duration !== state.duration) {
 *         dispatch({ type: 'SET_DURATION', duration });
 *       }
 *     });
 *     const offBuffer = audioEngine.on('buffer', ({ buffered }) => {
 *       dispatch({ type: 'SET_BUFFERED', buffered });
 *     });
 *     const offEnded = audioEngine.on('ended', () => {
 *       dispatch({ type: 'NEXT_TRACK' });
 *     });
 *     const offReady = audioEngine.on('ready', ({ duration }) => {
 *       dispatch({ type: 'SET_DURATION', duration });
 *     });
 *     const offError = audioEngine.on('error', (e) => {
 *       dispatch({ type: 'ERROR', message: e.message, code: e.code });
 *     });
 *     return () => {
 *       offTime(); offBuffer(); offEnded(); offReady(); offError();
 *     };
 *   }, [dispatch, state.duration]);
 *
 *   // Volume + mute
 *   useEffect(() => {
 *     audioEngine.setVolume(state.volume);
 *     audioEngine.setMuted(state.muted);
 *   }, [state.volume, state.muted]);
 *
 *   // Play/pause sync
 *   useEffect(() => {
 *     if (state.status === 'playing') {
 *       audioEngine.play().catch(() => {
 *         // Possibly blocked; dispatch a pause state?
 *       });
 *     } else if (state.status === 'paused') {
 *       audioEngine.pause();
 *     }
 *   }, [state.status]);
 * }
 */

import { useEffect, useRef } from "react";
import { Track } from "../state/types.js";
import { usePlayer } from "../state/playerState.js";

/**
 * Player Persistence Hook
 *
 * Responsibilities:
 *  - Load prior session on first mount (queue, currentTrackId, position, volume, muted, shuffle, repeatMode).
 *  - Save state changes (debounced + idle) to localStorage.
 *  - Avoid auto-playing unless the last session was very recent (RESUME_WINDOW_MS).
 *
 * Safe because:
 *  - Uses only existing actions (LOAD_QUEUE, SET_POSITION, SET_VOLUME, UPDATE_STATUS, SET_MUTE, TOGGLE_SHUFFLE, SET_REPEAT_MODE).
 *  - Does not introduce new action types.
 */

const STORAGE_KEY = "playerSession_v1";
const PERSIST_VERSION = 1;
const RESUME_WINDOW_MS = 3 * 60 * 1000; // 3 minutes

interface PersistShape {
  version: number;
  savedAt: number;
  queue: Track[];
  currentTrackId?: string;
  position: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeatMode: "off" | "one" | "all";
  lastStatus: string;
}

function safeParse(raw: string | null): PersistShape | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (typeof data !== "object" || data == null) return null;
    if (data.version !== PERSIST_VERSION) return null;
    if (!Array.isArray(data.queue)) return null;
    return data as PersistShape;
  } catch {
    return null;
  }
}

function schedule(fn: () => void, delay = 350) {
  const id = setTimeout(() => {
    // Try requestIdleCallback for lower priority if available
    if (typeof (window as any).requestIdleCallback === "function") {
      (window as any).requestIdleCallback(() => fn());
    } else {
      fn();
    }
  }, delay);
  return () => clearTimeout(id);
}

export function usePlayerPersistence() {
  const { state, dispatch } = usePlayer();
  const loadedRef = useRef(false);
  const saveTimeoutRef = useRef<() => void>();

  /* ---------- Load on first mount ---------- */
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    if (typeof window === "undefined") return;
    const data = safeParse(localStorage.getItem(STORAGE_KEY));
    if (!data) return;

    // Rehydrate queue first
    if (data.queue.length) {
      dispatch({
        type: "LOAD_QUEUE",
        queue: data.queue,
        startTrackId: data.currentTrackId,
      });
    }

    // Position restore (only if same track & plausible)
    if (data.position > 0 && data.currentTrackId) {
      dispatch({ type: "SET_POSITION", position: data.position });
    }

    // Volume / mute
    dispatch({ type: "SET_VOLUME", volume: data.volume });
    dispatch({ type: "SET_MUTE", muted: data.muted });

    // Shuffle / repeat
    if (data.shuffle !== state.shuffle) {
      dispatch({ type: "TOGGLE_SHUFFLE" });
    }
    if (data.repeatMode !== state.repeatMode) {
      dispatch({ type: "SET_REPEAT_MODE", mode: data.repeatMode });
    }

    // Decide whether to auto-resume
    const age = Date.now() - data.savedAt;
    const canResume =
      age <= RESUME_WINDOW_MS &&
      data.lastStatus === "playing" &&
      data.queue.length > 0;

    dispatch({
      type: "UPDATE_STATUS",
      status: canResume ? "paused" : data.queue.length ? "paused" : "idle",
      // We intentionally start paused even if it was previously playing,
      // user gesture needed to comply with autoplay policy.
    });
    // We intentionally exclude dependencies (only run once)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Save on changes (debounced) ---------- */
  useEffect(() => {
    if (!loadedRef.current) return; // don't save until load attempt done
    if (typeof window === "undefined") return;

    // Cancel prior scheduled save
    if (saveTimeoutRef.current) {
      saveTimeoutRef.current();
    }

    const persist: PersistShape = {
      version: PERSIST_VERSION,
      savedAt: Date.now(),
      queue: state.queue,
      currentTrackId: state.currentTrackId,
      position: state.position,
      volume: state.volume,
      muted: state.muted,
      shuffle: state.shuffle,
      repeatMode: state.repeatMode,
      lastStatus: state.status,
    };

    saveTimeoutRef.current = schedule(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
      } catch {
        // ignore quota / serialization errors
      }
    });

    return () => {
      if (saveTimeoutRef.current) {
        saveTimeoutRef.current();
        saveTimeoutRef.current = undefined;
      }
    };
  }, [
    state.queue,
    state.currentTrackId,
    state.position,
    state.volume,
    state.muted,
    state.shuffle,
    state.repeatMode,
    state.status,
  ]);
}

/**
 * Component wrapper to mount the hook declaratively.
 */
export const PlayerPersistence: React.FC = () => {
  usePlayerPersistence();
  return null;
};

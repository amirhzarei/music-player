import { useEffect, useRef } from "react";
import { usePlayer } from "../state/playerState.js";
import { Track } from "../state/types.js";
import { audioEngine } from "../lib/audioEngine.js";

/**
 * useAudioEngineBinding
 *
 * Bridges the imperative audioEngine with declarative PlayerState.
 * Mount this hook once near the root (inside <PlayerProvider>).
 *
 * Responsibilities:
 * - Load / switch tracks when currentTrackId changes.
 * - Reflect PlayerState.status into actual playback (play/pause).
 * - Dispatch position / duration / buffered updates from engine events.
 * - Handle end-of-track advancing (dispatch NEXT_TRACK).
 * - Propagate engine-originated state transitions (play/pause/errors).
 * - Keep volume & muted in sync.
 *
 * It does NOT:
 * - Decide business logic for queue ordering (handled by reducer).
 * - Persist anything (another hook will manage persistence).
 */

export function useAudioEngineBinding() {
  const { state, dispatch } = usePlayer();
  const lastTrackIdRef = useRef<string | undefined>();
  const wantedPlayRef = useRef<boolean>(false); // tracks user intent to play across loading boundaries

  const currentTrack: Track | undefined = state.queue.find(
    (t) => t.id === state.currentTrackId
  );

  /* -------- Track Loading -------- */
  useEffect(() => {
    const trackChanged = lastTrackIdRef.current !== state.currentTrackId;
    if (!trackChanged) return;

    lastTrackIdRef.current = state.currentTrackId;

    if (!currentTrack) {
      // No track selected => reset engine
      audioEngine.pause();
      audioEngine.load("", { autoplay: false });
      dispatch({ type: "UPDATE_STATUS", status: "idle" });
      return;
    }

    // Determine if we should attempt autoplay:
    // If prior state was 'playing' (i.e., user intended playback) OR status already 'playing'
    const shouldAutoplay = state.status === "playing";

    if (shouldAutoplay) {
      wantedPlayRef.current = true;
    }

    audioEngine.load(currentTrack.src, {
      autoplay: false, // we'll explicitly call play() after 'canplay'
      startPosition: 0,
    });

    // Mark status as loading unless something else already did
    dispatch({ type: "UPDATE_STATUS", status: "loading" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentTrackId, currentTrack?.src]);

  /* -------- Volume / Mute Sync -------- */
  useEffect(() => {
    audioEngine.setVolume(state.volume);
  }, [state.volume]);

  useEffect(() => {
    audioEngine.setMuted(state.muted);
  }, [state.muted]);

  /* -------- Play / Pause Intent Sync -------- */
  useEffect(() => {
    if (state.status === "playing") {
      // User (or UI) requested play.
      wantedPlayRef.current = true;
      // If engine already has a src & can play, attempt immediately.
      audioEngine.play().catch(() => {
        // Autoplay might fail (gesture requirement) — revert to paused.
        dispatch({ type: "UPDATE_STATUS", status: "paused" });
      });
    } else if (state.status === "paused") {
      wantedPlayRef.current = false;
      audioEngine.pause();
    } else if (state.status === "ended") {
      wantedPlayRef.current = false;
      audioEngine.pause();
    }
  }, [state.status, dispatch]);

  /* -------- Engine Event Subscriptions -------- */
  useEffect(() => {
    const offReady = audioEngine.on("ready", ({ duration }) => {
      dispatch({ type: "SET_DURATION", duration });
      // If we were waiting to play (user intent captured earlier), try now.
      if (wantedPlayRef.current) {
        audioEngine.play().catch(() => {
          // Leave status as paused if blocked
          dispatch({ type: "UPDATE_STATUS", status: "paused" });
        });
      } else {
        // If no intent, ensure we are considered paused (unless loading handshake)
        if (state.status === "loading") {
          dispatch({ type: "UPDATE_STATUS", status: "paused" });
        }
      }
    });

    const offCanPlay = audioEngine.on("canplay", () => {
      if (wantedPlayRef.current) {
        audioEngine.play().catch(() => {
          dispatch({ type: "UPDATE_STATUS", status: "paused" });
        });
      }
    });

    const offPlay = audioEngine.on("play", () => {
      dispatch({ type: "UPDATE_STATUS", status: "playing" });
    });

    const offPause = audioEngine.on("pause", () => {
      // Avoid overwriting 'loading' or 'ended' with 'paused'
      if (state.status !== "loading" && state.status !== "ended") {
        dispatch({ type: "UPDATE_STATUS", status: "paused" });
      }
    });

    const offEnded = audioEngine.on("ended", () => {
      // Engine ended naturally — advance queue logic handled by reducer
      dispatch({ type: "NEXT_TRACK" });
    });

    const offTime = audioEngine.on("time", ({ position, duration }) => {
      dispatch({ type: "SET_POSITION", position });
      if (duration && duration !== state.duration) {
        dispatch({ type: "SET_DURATION", duration });
      }
    });

    const offBuffer = audioEngine.on("buffer", ({ buffered }) => {
      dispatch({ type: "SET_BUFFERED", buffered });
    });

    const offError = audioEngine.on("error", (e) => {
      dispatch({ type: "ERROR", message: e.message, code: e.code });
    });

    return () => {
      offReady();
      offCanPlay();
      offPlay();
      offPause();
      offEnded();
      offTime();
      offBuffer();
      offError();
    };
  }, [dispatch, state.duration, state.status]);

  /* -------- Cleanup on Unmount -------- */
  useEffect(() => {
    return () => {
      audioEngine.pause();
    };
  }, []);
}

/**
 * Convenience component: place <AudioEngineBinding /> inside your root (within PlayerProvider).
 */
export const AudioEngineBinding: React.FC = () => {
  useAudioEngineBinding();
  return null;
};

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from "react";
import {
  PlayerState,
  PlayerAction,
  DEFAULT_PLAYER_STATE,
  Track,
  RepeatMode,
} from "../state/types.js";

/**
 * Player State Reducer
 * Pure, synchronous, serializable transformations of PlayerState.
 */

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "LOAD_QUEUE": {
      const queue = action.queue.slice();
      let currentTrackId = action.startTrackId;

      if (!currentTrackId && queue.length > 0) {
        currentTrackId = queue[0].id;
      }
      return {
        ...state,
        queue,
        currentTrackId,
        position: 0,
        duration: 0,
        status: queue.length ? "paused" : "idle",
      };
    }

    case "SET_CURRENT": {
      if (state.currentTrackId === action.trackId) return state;
      const exists = state.queue.some((t) => t.id === action.trackId);
      if (!exists) return state;
      return {
        ...state,
        currentTrackId: action.trackId,
        position: 0,
        duration: 0,
        status: "loading",
      };
    }

    case "UPDATE_STATUS":
      return { ...state, status: action.status };

    case "SET_POSITION":
      return { ...state, position: action.position };

    case "SET_BUFFERED":
      return { ...state, buffered: action.buffered };

    case "SET_DURATION":
      return { ...state, duration: action.duration };

    case "SET_VOLUME":
      return {
        ...state,
        volume: Math.min(1, Math.max(0, action.volume)),
        muted: action.volume === 0 ? state.muted : state.muted,
      };

    case "TOGGLE_MUTE":
      return { ...state, muted: !state.muted };

    case "SET_MUTE":
      return { ...state, muted: action.muted };

    case "TOGGLE_SHUFFLE":
      return { ...state, shuffle: !state.shuffle };

    case "SET_REPEAT_MODE":
      return { ...state, repeatMode: action.mode };

    case "REMOVE_TRACK": {
      const queue = state.queue.filter((t) => t.id !== action.trackId);
      let currentTrackId = state.currentTrackId;
      if (currentTrackId === action.trackId) {
        currentTrackId = queue[0]?.id;
      }
      return {
        ...state,
        queue,
        currentTrackId,
        status: queue.length ? state.status : "idle",
      };
    }

    case "ADD_TRACKS": {
      const existingIds = new Set(state.queue.map((t) => t.id));
      const newOnes = action.tracks.filter((t) => !existingIds.has(t.id));
      const queue =
        action.append !== false
          ? [...state.queue, ...newOnes]
          : [...newOnes, ...state.queue];
      return { ...state, queue };
    }

    case "REORDER_QUEUE": {
      const queue = state.queue.slice();
      if (
        action.from < 0 ||
        action.from >= queue.length ||
        action.to < 0 ||
        action.to >= queue.length
      ) {
        return state;
      }
      const [moved] = queue.splice(action.from, 1);
      queue.splice(action.to, 0, moved);
      return { ...state, queue };
    }

    case "NEXT_TRACK": {
      if (!state.queue.length) return state;

      // If shuffle, pick a random different track
      if (state.shuffle) {
        const candidates = state.queue.filter(
          (t) => t.id !== state.currentTrackId
        );
        if (candidates.length === 0) return state;
        const random =
          candidates[Math.floor(Math.random() * candidates.length)];
        return {
          ...state,
          currentTrackId: random.id,
          position: 0,
          duration: 0,
          status: "loading",
        };
      }

      const idx = state.queue.findIndex((t) => t.id === state.currentTrackId);
      if (idx === -1) {
        return {
          ...state,
          currentTrackId: state.queue[0].id,
          position: 0,
          duration: 0,
          status: "loading",
        };
      }

      if (idx === state.queue.length - 1) {
        // End of queue
        if (state.repeatMode === "all") {
          const first = state.queue[0];
          return {
            ...state,
            currentTrackId: first.id,
            position: 0,
            duration: 0,
            status: "loading",
          };
        } else {
          return {
            ...state,
            status: state.repeatMode === "one" ? "loading" : "ended",
            position: 0,
          };
        }
      }

      const next = state.queue[idx + 1];
      return {
        ...state,
        currentTrackId: next.id,
        position: 0,
        duration: 0,
        status: "loading",
      };
    }

    case "PREV_TRACK": {
      if (!state.queue.length) return state;
      const idx = state.queue.findIndex((t) => t.id === state.currentTrackId);
      if (idx <= 0) {
        // restart current or keep first
        return {
          ...state,
          position: 0,
        };
      }
      const prev = state.queue[idx - 1];
      return {
        ...state,
        currentTrackId: prev.id,
        position: 0,
        duration: 0,
        status: "loading",
      };
    }

    case "ERROR":
      return {
        ...state,
        status: "error",
        error: { message: action.message, code: action.code },
      };

    case "CLEAR_ERROR":
      if (state.status === "error") {
        return { ...state, status: "paused", error: undefined };
      }
      return { ...state, error: undefined };

    case "SET_UI":
      return {
        ...state,
        ui: { ...state.ui, ...action.patch },
      };

    default:
      return state;
  }
}

/* ---------- Contexts ---------- */

interface PlayerContextValue {
  state: PlayerState;
  dispatch: React.Dispatch<PlayerAction>;
  // Convenience action wrappers (these may later integrate with audio engine)
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  loadQueue: (tracks: Track[], startTrackId?: string) => void;
  setCurrent: (trackId: string) => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

/* ---------- Provider ---------- */

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(playerReducer, DEFAULT_PLAYER_STATE);

  // In future we will inject audio engine methods here.

  const play = useCallback(() => {
    // Actual audio engine play will dispatch status updates.
    dispatch({ type: "UPDATE_STATUS", status: "playing" });
  }, []);

  const pause = useCallback(() => {
    dispatch({ type: "UPDATE_STATUS", status: "paused" });
  }, []);

  const seek = useCallback((seconds: number) => {
    dispatch({ type: "SET_POSITION", position: Math.max(0, seconds) });
  }, []);

  const loadQueue = useCallback((tracks: Track[], startTrackId?: string) => {
    dispatch({ type: "LOAD_QUEUE", queue: tracks, startTrackId });
  }, []);

  const setCurrent = useCallback((trackId: string) => {
    dispatch({ type: "SET_CURRENT", trackId });
  }, []);

  const next = useCallback(() => {
    dispatch({ type: "NEXT_TRACK" });
  }, []);

  const prev = useCallback(() => {
    dispatch({ type: "PREV_TRACK" });
  }, []);

  const setVolume = useCallback((v: number) => {
    dispatch({ type: "SET_VOLUME", volume: v });
  }, []);

  const toggleMute = useCallback(() => {
    dispatch({ type: "TOGGLE_MUTE" });
  }, []);

  const toggleShuffle = useCallback(() => {
    dispatch({ type: "TOGGLE_SHUFFLE" });
  }, []);

  const cycleRepeat = useCallback(() => {
    const order: RepeatMode[] = ["off", "one", "all"];
    const idx = order.indexOf(state.repeatMode);
    const nextMode = order[(idx + 1) % order.length];
    dispatch({ type: "SET_REPEAT_MODE", mode: nextMode });
  }, [state.repeatMode]);

  const value: PlayerContextValue = useMemo(
    () => ({
      state,
      dispatch,
      play,
      pause,
      seek,
      loadQueue,
      setCurrent,
      next,
      prev,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
    }),
    [
      state,
      play,
      pause,
      seek,
      loadQueue,
      setCurrent,
      next,
      prev,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
    ]
  );

  return React.createElement(PlayerContext.Provider, { value }, children);
};

/* ---------- Hooks ---------- */

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within <PlayerProvider>");
  }
  return ctx;
}

export function usePlayerState() {
  return usePlayer().state;
}

export function usePlayerControls() {
  const {
    play,
    pause,
    seek,
    next,
    prev,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setCurrent,
    loadQueue,
  } = usePlayer();
  return {
    play,
    pause,
    seek,
    next,
    prev,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setCurrent,
    loadQueue,
  };
}

export function useCurrentTrack(): Track | undefined {
  const { state } = usePlayer();
  return state.queue.find((t) => t.id === state.currentTrackId);
}

/**
 * Simple helper to derive playback progress ratio (0..1).
 */
export function useProgressRatio(): number {
  const { position, duration } = usePlayerState();
  if (!duration || duration <= 0) return 0;
  return Math.min(1, position / duration);
}

/**
 * (Future) Integration Notes:
 * - audioEngine.ts will subscribe to state changes (currentTrackId, status, seek)
 *   and dispatch back real duration, position, buffered updates.
 * - We'll add an effect wrapper hook (e.g., useAudioEngineBinding) that sits
 *   near root (inside PlayerProvider or below) to connect DOM <audio>.
 */

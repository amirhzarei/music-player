/**
 * Global domain types for the music player.
 * Keep these lightweight and serializable (so they can be stored in IndexedDB).
 */

/* ---------- Track & Queue ---------- */

export interface Track {
  id: string; // UUID or hash
  title: string;
  artist?: string;
  src: string; // URL or object/blob URL
  duration?: number; // seconds (populated after metadata loads)
  artwork?: string; // optional image URL (could be object URL)
  addedAt: number; // timestamp (ms)
  local?: boolean; // true if user-provided (File input)
  type?: "audio/mpeg" | "audio/wav" | "audio/ogg" | string;
  album?: string;
  waveform?: {
    version: 1;
    bars: number;
    peaks: number[]; // [min0, max0, min1, max1, ...]
  };
  lyrics?: {
    raw: string;
    format: 'plain' | 'lrc';
    lines: {
      time: number | null; // seconds if LRC entry, null for plain
      text: string;
    }[];
    updatedAt: number;
  };
}

/**
 * Minimal persisted shape for a track if we later decide to separate
 * "library" vs "playlist" concerns. For now Track already fits persistence.
 */
export type PersistedTrack = Track;

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export interface PlayerUIState {
  seeking: boolean;
  showLyricsPanel?: boolean;
  lyricsEditMode?: boolean;
  gaplessEnabled?: boolean;          // user toggle
  gaplessPreloadSeconds?: number;
  showLyricInBar?: boolean;
}

/* ---------- Player State ---------- */

export type PlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "ended"
  | "error";

export type RepeatMode = "off" | "one" | "all";

export interface PlayerState {
  queue: Track[];
  currentTrackId?: string;
  status: PlaybackStatus;
  position: number; // current time (seconds)
  buffered: number; // buffered end (seconds) - may refactor to ranges
  duration: number; // duration of current track (seconds)
  volume: number; // 0..1
  muted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  // Error context if status === 'error'
  error?: {
    message: string;
    code?: string;
  };
  // UI ephemeral flags (not necessarily persisted)
  ui: PlayerUIState
}

/* ---------- Events & Actions (for a reducer-like pattern) ---------- */

export type PlayerAction =
  | { type: "LOAD_QUEUE"; queue: Track[]; startTrackId?: string }
  | { type: "SET_CURRENT"; trackId: string }
  | { type: "UPDATE_STATUS"; status: PlaybackStatus }
  | { type: "SET_POSITION"; position: number }
  | { type: "SET_BUFFERED"; buffered: number }
  | { type: "SET_DURATION"; duration: number }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "TOGGLE_MUTE" }
  | { type: "SET_MUTE"; muted: boolean }
  | { type: "TOGGLE_SHUFFLE" }
  | { type: "SET_REPEAT_MODE"; mode: RepeatMode }
  | { type: "NEXT_TRACK" }
  | { type: "PREV_TRACK" }
  | { type: "REMOVE_TRACK"; trackId: string }
  | { type: "ADD_TRACKS"; tracks: Track[]; append?: boolean }
  | { type: "REORDER_QUEUE"; from: number; to: number }
  | { type: "ERROR"; message: string; code?: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_UI"; patch: Partial<PlayerState["ui"]> };

/* ---------- Persistence Shapes ---------- */

export interface PersistedPlayerSnapshot {
  version: number;
  queue: PersistedTrack[];
  currentTrackId?: string;
  position: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  timestamp: number;
}

/* ---------- Constants ---------- */

export const PERSIST_VERSION = 1;

export const DEFAULT_PLAYER_STATE: PlayerState = {
  queue: [],
  currentTrackId: undefined,
  status: "idle",
  position: 0,
  buffered: 0,
  duration: 0,
  volume: 0.9,
  muted: false,
  shuffle: false,
  repeatMode: "off",
  ui: {
    // playlistOpen: true,
    seeking: false,

  },
};

/* ---------- Type Guards ---------- */

export function isTrack(value: any): value is Track {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.src === "string"
  );
}

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  Dispatch
} from 'react';
import type {
  Track,
  PlayerState,
  PlayerStatus,
  RepeatMode,
  PlayerUIState
} from './types.js';

/* ---------------------------------- Actions --------------------------------- */
export type PlayerAction =
  | { type: 'LOAD_QUEUE'; queue: Track[]; startTrackId?: string }
  | { type: 'REMOVE_TRACK'; trackId: string }
  | { type: 'SET_CURRENT'; trackId?: string }
  | { type: 'SET_POSITION'; position: number }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'SET_BUFFERED'; buffered: number }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'SET_MUTE'; muted: boolean }
  | { type: 'UPDATE_STATUS'; status: PlayerStatus }
  | { type: 'SET_UI'; patch: Partial<PlayerUIState> }
  | { type: 'TOGGLE_SHUFFLE' }
  | { type: 'SET_REPEAT_MODE'; mode: RepeatMode }
  | { type: 'UPDATE_TRACK'; trackId: string; patch: Partial<Track> }
  | { type: 'REORDER_QUEUE'; from: number; to: number };

const initialState: PlayerState = {
  queue: [],
  currentTrackId: undefined,
  status: 'idle',
  position: 0,
  duration: 0,
  buffered: 0,
  volume: 0.9,
  muted: false,
  shuffle: false,
  repeatMode: 'off',
  ui: {
  seeking: false,
  showLyricsPanel: false,
  lyricsEditMode: false,
  gaplessEnabled: true,
  gaplessPreloadSeconds: 6,
  showLyricInBar: true   // NEW
}
};

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'LOAD_QUEUE':
      return {
        ...state,
        queue: action.queue,
        currentTrackId: action.startTrackId,
        status: action.startTrackId ? 'loading' : 'idle',
        position: 0,
        duration: 0,
        buffered: 0
      };
    case 'REMOVE_TRACK': {
      const queue = state.queue.filter(t => t.id !== action.trackId);
      let currentTrackId = state.currentTrackId;
      let status = state.status;
      if (state.currentTrackId === action.trackId) {
        currentTrackId = undefined;
        status = queue.length ? 'idle' : 'idle';
      }
      return { ...state, queue, currentTrackId, status };
    }
    case 'SET_CURRENT':
      if (action.trackId && !state.queue.find(t => t.id === action.trackId)) return state;
      return {
        ...state,
        currentTrackId: action.trackId,
        status: action.trackId ? 'loading' : 'idle',
        position: 0,
        duration: 0,
        buffered: 0
      };
    case 'SET_POSITION':
      return { ...state, position: action.position };
    case 'SET_DURATION':
      return { ...state, duration: action.duration };
    case 'SET_BUFFERED':
      return { ...state, buffered: action.buffered };
    case 'SET_VOLUME':
      return { ...state, volume: action.volume };
    case 'SET_MUTE':
      return { ...state, muted: action.muted };
    case 'UPDATE_STATUS':
      return { ...state, status: action.status };
    case 'SET_UI':
      return { ...state, ui: { ...state.ui, ...action.patch } };
    case 'TOGGLE_SHUFFLE':
      return { ...state, shuffle: !state.shuffle };
    case 'SET_REPEAT_MODE':
      return { ...state, repeatMode: action.mode };
    case 'UPDATE_TRACK': {
      const queue = state.queue.map(t =>
        t.id === action.trackId ? { ...t, ...action.patch } : t
      );
      return { ...state, queue };
    }
    case 'REORDER_QUEUE': {
      const { from, to } = action;
      if (
        from < 0 ||
        to < 0 ||
        from >= state.queue.length ||
        to >= state.queue.length ||
        from === to
      ) return state;
      const newQueue = state.queue.slice();
      const [moved] = newQueue.splice(from, 1);
      newQueue.splice(to, 0, moved);
      return { ...state, queue: newQueue };
    }
    default:
      return state;
  }
}

/* Context */
interface PlayerContextValue {
  state: PlayerState;
  dispatch: Dispatch<PlayerAction>;
}
const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export const PlayerProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return React.createElement(PlayerContext.Provider, { value }, children);
};

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
export function usePlayerState(): PlayerState {
  return usePlayer().state;
}
export function useCurrentTrack(): Track | undefined {
  const { state } = usePlayer();
  return state.queue.find(t => t.id === state.currentTrackId);
}

/* Controls */
export function usePlayerControls() {
  const { state, dispatch } = usePlayer();

  const play = () => {
    if (!state.currentTrackId && state.queue.length) {
      dispatch({ type: 'SET_CURRENT', trackId: state.queue[0].id });
      return;
    }
    if (state.currentTrackId) {
      dispatch({ type: 'UPDATE_STATUS', status: 'playing' });
    }
  };

  const pause = () => {
    if (state.status === 'playing') {
      dispatch({ type: 'UPDATE_STATUS', status: 'paused' });
    }
  };

  const setCurrent = (trackId: string) =>
    dispatch({ type: 'SET_CURRENT', trackId });

  const loadQueue = (queue: Track[], startTrackId?: string) =>
    dispatch({ type: 'LOAD_QUEUE', queue, startTrackId });

  const next = () => {
    if (!state.queue.length || !state.currentTrackId) return;
    const idx = state.queue.findIndex(t => t.id === state.currentTrackId);

    if (state.repeatMode === 'one') {
      dispatch({ type: 'SET_POSITION', position: 0 });
      dispatch({ type: 'UPDATE_STATUS', status: 'playing' });
      return;
    }

    if (state.shuffle) {
      const others = state.queue.filter(t => t.id !== state.currentTrackId);
      if (!others.length) return;
      const pick = others[Math.floor(Math.random() * others.length)];
      dispatch({ type: 'SET_CURRENT', trackId: pick.id });
      return;
    }

    let nextIndex = idx + 1;
    if (nextIndex >= state.queue.length) {
      if (state.repeatMode === 'all') nextIndex = 0;
      else {
        dispatch({ type: 'UPDATE_STATUS', status: 'paused' });
        return;
      }
    }
    dispatch({ type: 'SET_CURRENT', trackId: state.queue[nextIndex].id });
  };

  const prev = () => {
    if (!state.queue.length || !state.currentTrackId) return;
    const idx = state.queue.findIndex(t => t.id === state.currentTrackId);
    if (idx <= 0) {
      dispatch({ type: 'SET_POSITION', position: 0 });
      return;
    }
    dispatch({ type: 'SET_CURRENT', trackId: state.queue[idx - 1].id });
  };

  const seek = (position: number) =>
    dispatch({ type: 'SET_POSITION', position });

  const setVolume = (volume: number) =>
    dispatch({ type: 'SET_VOLUME', volume });

  const toggleMute = () => dispatch({ type: 'SET_MUTE', muted: !state.muted });

  const toggleShuffle = () => dispatch({ type: 'TOGGLE_SHUFFLE' });

  const cycleRepeat = () => {
    const order: RepeatMode[] = ['off', 'one', 'all'];
    const idx = order.indexOf(state.repeatMode);
    dispatch({ type: 'SET_REPEAT_MODE', mode: order[(idx + 1) % order.length] });
  };

  const reorder = (from: number, to: number) =>
    dispatch({ type: 'REORDER_QUEUE', from, to });

  return {
    play,
    pause,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setCurrent,
    loadQueue,
    reorder
  };
}
import { useEffect } from 'react';
import { usePlayerState, usePlayerControls, usePlayer } from '../state/playerState.js';

const isEditable = (el: Element | null): boolean => {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  const anyEl = el as HTMLElement;
  if (anyEl.isContentEditable) return true;
  return false;
};

export function useKeyboardShortcuts() {
  const state = usePlayerState();
  const { dispatch } = usePlayer();
  const { play, pause, seek, toggleMute, setVolume, toggleShuffle, cycleRepeat } =
    usePlayerControls();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as Element | null;
      if (isEditable(target)) return;

      const key = e.key.toLowerCase();
      const playing = state.status === 'playing';

      // Space & 'k' => play/pause
      if (key === ' ' || key === 'k') {
        e.preventDefault();
        if (playing) pause();
        else play();
        return;
      }

      // Arrow seeking
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (!state.duration) return;
        const step = e.shiftKey ? 15 : 5;
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        seek(Math.min(Math.max(state.position + dir * step, 0), state.duration));
        e.preventDefault();
        return;
      }

      // Volume up/down
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const delta = 0.05 * (e.key === 'ArrowUp' ? 1 : -1);
        const nextVol = Math.min(
          1,
          Math.max(0, state.muted ? (delta > 0 ? delta : 0) : state.volume + delta)
        );
        setVolume(nextVol);
        e.preventDefault();
        return;
      }

      switch (key) {
        case 'm':
          toggleMute();
          break;
        case 's':
          toggleShuffle();
          break;
        case 'r':
          cycleRepeat();
          break;
        case 'home':
          if (state.duration) seek(0);
          break;
        case 'end':
          if (state.duration) seek(state.duration);
          break;
        case 'l':
          // Toggle lyrics panel
          dispatch({
            type: 'SET_UI',
            patch: { showLyricsPanel: !state.ui.showLyricsPanel, lyricsEditMode: false }
          });
          break;
        default:
          // Digit jump (number row only)
          if (/^[0-9]$/.test(key) && state.duration) {
            const digit = parseInt(key, 10);
            const ratio = digit / 10;
            seek(state.duration * ratio);
            e.preventDefault();
          }
          break;
      }
    };

    window.addEventListener('keydown', handler, { passive: false });
    return () => window.removeEventListener('keydown', handler);
  }, [
    state.status,
    state.position,
    state.duration,
    state.volume,
    state.muted,
    state.ui.showLyricsPanel,
    play,
    pause,
    seek,
    toggleMute,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    dispatch
  ]);
}

export const KeyboardShortcutsBinding: React.FC = () => {
  useKeyboardShortcuts();
  return null;
};
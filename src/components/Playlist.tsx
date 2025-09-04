import React, { useCallback } from 'react';
import { X, Play, Loader2 } from 'lucide-react';
import { usePlayer, usePlayerControls } from '../state/playerState.js';
import { Track } from '../state/types.js';
import { formatTime } from '../utils/time.js';

interface PlaylistProps {
    className?: string;
}

export const Playlist: React.FC<PlaylistProps> = ({ className }) => {
    const { state, dispatch } = usePlayer();
    const { setCurrent, play } = usePlayerControls();

    const onSelect = useCallback(
        (track: Track) => {
            if (state.currentTrackId === track.id) {
                if (state.status !== 'playing') {
                    play();
                }
                return;
            }
            setCurrent(track.id);
            play();
        },
        [setCurrent, play, state.currentTrackId, state.status]
    );

    const onRemove = useCallback(
        (trackId: string, e: React.MouseEvent) => {
            e.stopPropagation();
            dispatch({ type: 'REMOVE_TRACK', trackId });
        },
        [dispatch]
    );

    if (!state.queue.length) {
        return (
            <div className={`panel p-4 flex flex-col gap-4 items-center justify-center min-h-[240px] ${className || ''}`}>
                <p className="text-sm text-text-dim">Playlist empty.</p>
                <p className="text-[11px] text-text-mute">
                    Use the sample loader or implement file upload next.
                </p>
            </div>
        );
    }

    return (
        <div className={`panel p-3 flex flex-col ${className || ''}`}>
            <header className="flex items-center justify-between px-1 pb-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
                    Playlist
                </h3>
                <button
                    className="btn-ghost h-7 px-2 text-[11px]"
                    onClick={() => dispatch({ type: 'LOAD_QUEUE', queue: [] })}
                >
                    Clear
                </button>
            </header>
            <ul className="flex-1 overflow-auto pr-1 space-y-1 text-sm">
                {state.queue.map((t, idx) => {
                    const active = t.id === state.currentTrackId;
                    const loading = active && state.status === 'loading';
                    const playing = active && state.status === 'playing';
                    return (
                        <li
                            key={t.id}
                            onClick={() => onSelect(t)}
                            className={`group rounded-md px-2 py-2 cursor-pointer flex items-center gap-3 card-hover transition ${active ? 'bg-bg-softer' : ''
                                }`}
                        >
                            <div className="w-5 text-[10px] text-text-mute flex justify-end">
                                {idx + 1}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="truncate text-[13px] font-medium">
                                    {t.title}
                                </span>
                                <span className="text-[11px] text-text-mute truncate">
                                    {t.artist || '—'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-text-mute tabular-nums">
                                    {t.duration ? formatTime(t.duration) : ''}
                                </span>
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                                ) : playing ? (
                                    <div className="flex items-end gap-[2px] h-4 w-4 pr-0.5">
                                        <span className="bg-accent/80 w-[2px] animate-pulse h-3 rounded-sm" />
                                        <span className="bg-accent/60 w-[2px] animate-pulse h-1.5 rounded-sm" />
                                        <span className="bg-accent/90 w-[2px] animate-pulse h-2 rounded-sm" />
                                        <span className="bg-accent/70 w-[2px] animate-pulse h-2.5 rounded-sm" />
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelect(t);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition text-text-dim hover:text-text"
                                        aria-label="Play track"
                                    >
                                        <Play className="h-4 w-4" />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => onRemove(t.id, e)}
                                    className="opacity-0 group-hover:opacity-100 transition text-text-mute hover:text-text"
                                    aria-label="Remove track"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
            <footer className="pt-2 mt-2 border-t border-border/40">
                <p className="text-[10px] text-text-mute">
                    {state.queue.length} track{state.queue.length === 1 ? '' : 's'}
                </p>
            </footer>
        </div>
    );
};
import React, { useCallback, useRef, useState } from 'react';
import { X, Play, Loader2, GripVertical } from 'lucide-react';
import { usePlayer, usePlayerControls } from '../state/playerState.js';
import { Track } from '../state/types.js';
import { formatTime } from '../utils/time.js';

interface PlaylistProps {
    className?: string;
}

interface DragState {
    fromIndex: number;
    overIndex: number;
    position: 'before' | 'after'; // drop indicator placement relative to hovered item
}

export const Playlist: React.FC<PlaylistProps> = ({ className }) => {
    const { state, dispatch } = usePlayer();
    const { setCurrent, play, reorder } = usePlayerControls();

    const [dragState, setDragState] = useState<DragState | null>(null);
    const dragFromIndexRef = useRef<number | null>(null);

    const onSelect = useCallback(
        (track: Track) => {
            if (state.currentTrackId === track.id) {
                if (state.status !== 'playing') play();
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

    // Drag handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        dragFromIndexRef.current = index;
        e.dataTransfer.effectAllowed = 'move';
        // For Firefox
        e.dataTransfer.setData('text/plain', String(index));
        setDragState({
            fromIndex: index,
            overIndex: index,
            position: 'after'
        });
    };

    const computeDropPosition = (
        e: React.DragEvent,
        itemElement: HTMLElement
    ): 'before' | 'after' => {
        const rect = itemElement.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        return offsetY < rect.height / 2 ? 'before' : 'after';
    };

    const handleDragOver = (e: React.DragEvent, overIndex: number) => {
        e.preventDefault(); // allow drop
        if (dragFromIndexRef.current == null) return;
        const target = e.currentTarget as HTMLElement;
        const pos = computeDropPosition(e, target);
        setDragState({
            fromIndex: dragFromIndexRef.current,
            overIndex,
            position: pos
        });
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // If leaving the UL entirely we could clear indicator; optional
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (dragFromIndexRef.current == null || !dragState) {
            cleanupDrag();
            return;
        }
        const from = dragFromIndexRef.current;
        let to = dropIndex;
        // Adjust target index if dropping after & moving forward/backwards
        if (dragState.position === 'after') {
            to = dropIndex + (from < dropIndex ? 0 : 1) - 1 + 1; // simplified; ensures "after" means insertion after item
            to = dropIndex + 1;
        }
        if (dragState.position === 'before') {
            to = dropIndex;
        }

        // If dragging downwards and inserting after, natural shift occurs automatically
        // We'll let reorder handle bounds.
        if (from !== to) {
            // If dropping at end (after last item)
            if (to > state.queue.length - 1) {
                to = state.queue.length - 1;
            }
            reorder(from, to);
        }
        cleanupDrag();
    };

    const handleDragEnd = () => {
        cleanupDrag();
    };

    const cleanupDrag = () => {
        dragFromIndexRef.current = null;
        setDragState(null);
    };

    const renderDropIndicator = (index: number, position: 'before' | 'after') => {
        if (
            !dragState ||
            dragState.overIndex !== index ||
            dragState.position !== position
        )
            return null;
        return (
            <div
                className="absolute left-0 right-0 h-[2px] bg-accent"
                style={{
                    top: position === 'before' ? 0 : undefined,
                    bottom: position === 'after' ? 0 : undefined
                }}
            />
        );
    };

    if (!state.queue.length) {
        return (
            <div
                className={`panel p-4 flex flex-col gap-4 items-center justify-center min-h-[240px] ${className || ''
                    }`}
            >
                <p className="text-sm text-text-dim">Playlist empty.</p>
                <p className="text-[11px] text-text-mute">
                    Use the sample loader or upload local files.
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
                    const isDragSource =
                        dragState && dragState.fromIndex === idx;

                    return (
                        <li
                            key={t.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, idx)}
                            onDragEnd={handleDragEnd}
                            onClick={() => onSelect(t)}
                            className={`group relative rounded-md px-2 py-2 cursor-pointer flex items-center gap-3 card-hover transition
                ${active ? 'bg-bg-softer' : ''
                                } ${isDragSource ? 'opacity-60' : ''}`}
                        >
                            {/* Drop indicators */}
                            {renderDropIndicator(idx, 'before')}
                            {renderDropIndicator(idx, 'after')}

                            <div className="w-4 flex justify-center text-text-dim">
                                <GripVertical className="h-4 w-4 cursor-grab active:cursor-grabbing opacity-60 group-hover:opacity-100 transition" />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="truncate text-[13px] font-medium">
                                    {t.title}
                                </span>
                                <span className="text-[11px] text-text-mute truncate">
                                    {t.artist || '—'}
                                </span>
                                {t.album && <span className="sr-only">{t.album}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-text-mute tabular-nums">
                                    {typeof t.duration === 'number' ? formatTime(t.duration) : ''}
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
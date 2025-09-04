import React, { useCallback, useRef, useState } from 'react';
import { usePlayer } from '../state/playerState.js';
import { clampPosition } from '../utils/time.js';

/**
 * ProgressBar
 * Interactive seek bar that:
 *  - Shows played + buffered portions.
 *  - Allows click + drag (mouse & touch) seeking.
 *
 * Responsibilities:
 *  - Derive ratios from PlayerState (position / duration / buffered).
 *  - Dispatch SET_POSITION optimistically while dragging (with ui.seeking flag).
 *  - On release, actually performs engine seek by dispatching SET_POSITION (binding reacts).
 *
 * The actual audio element seeking is handled indirectly (useAudioEngineBinding),
 * because we update position in state; engine binding listens for track changes
 * and status. For immediate seeking feedback we optimistically update position here.
 */

interface ProgressBarProps {
    className?: string;
    height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ className, height = 8 }) => {
    const { state, dispatch } = usePlayer();
    const { position, duration, buffered } = state;
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [isDragging, setDragging] = useState(false);
    const [dragPos, setDragPos] = useState<number | null>(null);

    const playedRatio = duration > 0 ? Math.min(1, (dragPos ?? position) / duration) : 0;
    const bufferedRatio = duration > 0 ? Math.min(1, buffered / duration) : 0;

    const calcPositionFromClientX = useCallback(
        (clientX: number) => {
            const el = wrapperRef.current;
            if (!el) return position;
            const rect = el.getBoundingClientRect();
            const x = clientX - rect.left;
            const ratio = Math.min(1, Math.max(0, x / rect.width));
            return clampPosition(ratio * (duration || 0), duration || 0);
        },
        [duration, position]
    );

    const commitSeek = useCallback(
        (seekTo: number) => {
            dispatch({ type: 'SET_POSITION', position: seekTo });
            // Clear seeking flag
            dispatch({ type: 'SET_UI', patch: { seeking: false } });
        },
        [dispatch]
    );

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (!duration) return;
            // Only left click / primary
            if (e.button !== 0) return;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            const nextPos = calcPositionFromClientX(e.clientX);
            setDragPos(nextPos);
            setDragging(true);
            dispatch({ type: 'SET_UI', patch: { seeking: true } });
        },
        [calcPositionFromClientX, dispatch, duration]
    );

    const onPointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!isDragging || !duration) return;
            const nextPos = calcPositionFromClientX(e.clientX);
            setDragPos(nextPos);
        },
        [isDragging, calcPositionFromClientX, duration]
    );

    const onPointerUp = useCallback(
        (e: React.PointerEvent) => {
            if (!isDragging) return;
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            setDragging(false);
            const finalPos = dragPos != null ? dragPos : position;
            setDragPos(null);
            commitSeek(finalPos);
        },
        [commitSeek, dragPos, isDragging, position]
    );

    const onClick = useCallback(
        (e: React.MouseEvent) => {
            // If a drag just ended, ignore the click (some browsers emit click after pointerup)
            if (isDragging || !duration) return;
            const seekTo = calcPositionFromClientX(e.clientX);
            commitSeek(seekTo);
        },
        [isDragging, duration, calcPositionFromClientX, commitSeek]
    );

    return (
        <div
            ref={wrapperRef}
            className={`progress-wrapper group select-none ${isDragging ? 'dragging' : ''} ${className || ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={onClick}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, Math.floor(duration))}
            aria-valuenow={Math.floor(dragPos ?? position)}
            aria-label="Seek"
            tabIndex={0}
        >
            <div
                className="progress-track"
                style={{ height: height / 2 }}
            />
            {bufferedRatio > 0 && (
                <div
                    className="progress-buffered"
                    style={{
                        width: `${bufferedRatio * 100}%`
                    }}
                />
            )}
            <div
                className="progress-played"
                style={{
                    width: `${playedRatio * 100}%`
                }}
            />
            {/* Handle */}
            <div
                className="progress-handle"
                style={{
                    left: `${playedRatio * 100}%`
                }}
            />
        </div>
    );
};
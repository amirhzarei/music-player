import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { usePlayer, useCurrentTrack } from '../state/playerState.js';

interface WaveformProgressProps {
    height?: number;
    barColor?: string;
    progressColor?: string;
    className?: string;
    seekOnWave?: boolean;
}

export const WaveformProgress: React.FC<WaveformProgressProps> = ({
    height = 56,
    barColor = 'var(--accent, #6366f1)',
    progressColor = 'rgba(var(--accent-rgb,99,102,241),0.28)',
    className,
    seekOnWave = true
}) => {
    const { state, dispatch } = usePlayer();
    const track = useCurrentTrack();
    const [localPos, setLocalPos] = useState(0);
    const seekingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Sync local position if not seeking
    useEffect(() => {
        if (!seekingRef.current) {
            setLocalPos(state.position);
        }
    }, [state.position]);

    const duration = state.duration || track?.duration || 0;
    const waveform = track?.waveform;
    const bars = waveform?.bars || 0;

    const percent = duration
        ? (seekingRef.current ? localPos : state.position) / duration
        : 0;

    const pathData = useMemo(() => {
        if (!waveform || !bars) return '';
        const peaks = waveform.peaks;
        const width = bars;
        const h = height;
        const mid = h / 2;

        // Build vertical bars (thin path segments)
        // We'll use path commands for efficiency
        let d = '';
        for (let i = 0; i < bars; i++) {
            const min = peaks[i * 2];
            const max = peaks[i * 2 + 1];
            const y1 = mid + min * mid;
            const y2 = mid + max * mid;
            // Draw a line (use move + line to create a thin vertical)
            d += `M${i} ${y1}L${i} ${y2}`;
        }
        return d;
    }, [waveform, bars, height]);

    const handlePointer = useCallback(
        (clientX: number) => {
            if (!duration || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
            const ratio = rect.width ? x / rect.width : 0;
            const newPos = ratio * duration;
            setLocalPos(newPos);
        },
        [duration]
    );

    const commitSeek = useCallback(
        (pos: number) => {
            if (!duration) return;
            dispatch({ type: 'SET_UI', patch: { seeking: false } });
            dispatch({ type: 'SET_POSITION', position: pos });
            seekingRef.current = false;
        },
        [dispatch, duration]
    );

    const onPointerDown = (e: React.PointerEvent) => {
        if (!seekOnWave || !duration) return;
        seekingRef.current = true;
        dispatch({ type: 'SET_UI', patch: { seeking: true } });
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        handlePointer(e.clientX);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!seekOnWave || !seekingRef.current) return;
        handlePointer(e.clientX);
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (!seekOnWave || !seekingRef.current) return;
        handlePointer(e.clientX);
        commitSeek(localPos);
    };

    const fallback = !waveform || !bars;

    return (
        <div
            ref={containerRef}
            className={`relative w-full select-none ${className || ''}`}
            style={{ height }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            role="progressbar"
            aria-valuenow={Math.floor((percent || 0) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Waveform seek bar"
        >
            {/* Background (progress fill) */}
            <div
                className="absolute inset-y-0 left-0"
                style={{
                    width: `${percent * 100}%`,
                    background:
                        fallback
                            ? 'linear-gradient(to right,var(--accent,#6366f1),var(--accent,#6366f1))'
                            : progressColor,
                    opacity: fallback ? 0.25 : 1
                }}
            />
            {/* Waveform */}
            {!fallback && (
                <svg
                    width="100%"
                    height={height}
                    viewBox={`0 0 ${bars} ${height}`}
                    preserveAspectRatio="none"
                    className="absolute inset-0"
                >
                    <path
                        d={pathData}
                        stroke={barColor}
                        strokeWidth="1"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            )}
            {/* Fallback thin bar if no waveform */}
            {fallback && (
                <div className="absolute inset-0 flex items-center">
                    <div className="h-[4px] w-full rounded bg-bg-soft overflow-hidden">
                        <div
                            className="h-full bg-accent/60"
                            style={{ width: `${percent * 100}%` }}
                        />
                    </div>
                </div>
            )}
            {/* Scrub indicator / knob */}
            <div
                className="absolute top-0 bottom-0"
                style={{
                    left: `calc(${percent * 100}% - 6px)`,
                    pointerEvents: 'none'
                }}
            >
                <div
                    className={`absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-bg-base ${seekingRef.current ? 'bg-accent' : 'bg-accent/90'
                        } shadow`}
                />
            </div>
        </div>
    );
};
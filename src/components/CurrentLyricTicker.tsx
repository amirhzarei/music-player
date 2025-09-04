import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useCurrentTrack, usePlayerState, usePlayer } from '../state/playerState.js';
import { useSyncedLyrics } from '../hooks/useSyncedLyrics.js';
import { FileText } from 'lucide-react';

interface CurrentLyricTickerProps {
    showNextDefault?: boolean;
    className?: string;
    collapsedHeight?: number;
    autoHideIfPanelOpen?: boolean;
}

export const CurrentLyricTicker: React.FC<CurrentLyricTickerProps> = ({
    showNextDefault = false,
    className,
    collapsedHeight = 40,
    autoHideIfPanelOpen = true
}) => {
    // ---------------------------------------------------------------------------
    // Hooks (order must NEVER change)
    // ---------------------------------------------------------------------------
    const track = useCurrentTrack();
    const playerState = usePlayerState();
    const { dispatch } = usePlayer();

    const lines = track?.lyrics?.lines;
    const format = track?.lyrics?.format;
    const isTimed = format === 'lrc' && !!lines?.some(l => l.time != null);

    // UI local state
    const [showNext, setShowNext] = useState(showNextDefault);
    const [overflow, setOverflow] = useState(false);

    // Determine visibility (do NOT return early yet)
    const hidden =
        (autoHideIfPanelOpen && playerState.ui.showLyricsPanel) ||
        !playerState.ui.showLyricInBar;

    // Always call the synced hook (disabled if hidden or not timed)
    const synced = useSyncedLyrics(lines, playerState.position, {
        disabled: hidden || !isTimed
    });

    // Refs
    const currentRef = useRef<HTMLDivElement | null>(null);

    // ---------------------------------------------------------------------------
    // Derived text
    // ---------------------------------------------------------------------------
    const { currentText, nextText } = useMemo(() => {
        if (!lines || !lines.length) {
            return { currentText: 'No lyrics', nextText: '' };
        }
        if (isTimed) {
            if (synced.activeIndex < 0) {
                // Not reached first timed line yet
                const firstTimed = lines.find(l => l.time != null);
                return {
                    currentText: firstTimed ? firstTimed.text : lines[0].text,
                    nextText: ''
                };
            }
            const cur = lines[synced.activeIndex]?.text || '';
            // Find next timed line
            let nxt = '';
            for (let i = synced.activeIndex + 1; i < lines.length; i++) {
                if (lines[i].time != null) {
                    nxt = lines[i].text;
                    break;
                }
            }
            return { currentText: cur || ' ', nextText: nxt };
        }
        // Plain (non‑timed) lyrics
        return {
            currentText: lines[0].text,
            nextText: lines[1]?.text || ''
        };
    }, [lines, isTimed, synced.activeIndex]);

    // ---------------------------------------------------------------------------
    // Effects
    // ---------------------------------------------------------------------------
    useEffect(() => {
        // Re-check overflow when line / layout changes
        const el = currentRef.current;
        if (!el) {
            setOverflow(false);
            return;
        }
        const needs = el.scrollWidth > el.clientWidth + 4;
        setOverflow(needs);
    }, [currentText, showNext, hidden]);

    // ---------------------------------------------------------------------------
    // Event handlers
    // ---------------------------------------------------------------------------
    const toggleShowNext = () => {
        if (!nextText) return;
        setShowNext(s => !s);
    };

    const openPanel = () => {
        try {
            dispatch({
                type: 'SET_UI',
                patch: { showLyricsPanel: true, lyricsEditMode: false }
            });
        } catch (err) {
            // swallow
        }
    };

    // ---------------------------------------------------------------------------
    // EARLY RETURN (after all hooks)
    // ---------------------------------------------------------------------------
    if (hidden) return null;

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
        <div
            className={`relative group rounded-md bg-bg-soft/60 border border-border/40 px-3 py-2 overflow-hidden transition
        ${className || ''}`}
            style={{
                minHeight: showNext && nextText ? collapsedHeight + 20 : collapsedHeight
            }}
            data-lyric-ticker
        >
            <div className="flex items-center gap-2 mb-1">
                <button
                    onClick={openPanel}
                    className="text-text-mute hover:text-accent transition p-1 -ml-1"
                    aria-label="Open lyrics panel"
                    title="Open full lyrics (L)"
                    type="button"
                >
                    <FileText className="h-4 w-4" />
                </button>
                <div className="flex-1 h-[1px] bg-border/40" />
                {isTimed && nextText && (
                    <button
                        onClick={toggleShowNext}
                        className="text-[10px] uppercase tracking-wide text-text-mute hover:text-text-dim transition"
                        aria-label="Toggle next line preview"
                        type="button"
                    >
                        {showNext ? 'Hide Next' : 'Show Next'}
                    </button>
                )}
            </div>

            <div className="relative">
                <div
                    ref={currentRef}
                    aria-live="polite"
                    className={`ticker-line text-[13px] leading-snug font-medium ${isTimed ? 'text-text' : 'text-text-dim'
                        } ${overflow ? 'ticker-overflow' : ''}`}
                >
                    {currentText}
                </div>
                {showNext && nextText && (
                    <div
                        className="mt-1 text-[11px] leading-snug text-text-mute/80 italic line-clamp-2"
                        aria-label="Next lyric line"
                    >
                        {nextText}
                    </div>
                )}
            </div>

            {isTimed && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent/70 rounded-r opacity-70 pointer-events-none" />
            )}
        </div>
    );
};
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { X, Edit3, Save, CornerDownLeft, Eye, EyeOff, ArrowUpCircle } from 'lucide-react';
import { usePlayer, useCurrentTrack, usePlayerState } from '../state/playerState.js';
import { parseLyrics } from '../utils/lyrics.js';
import { useSyncedLyrics } from '../hooks/useSyncedLyrics.js';

interface ScrollConfig {
    autoScroll: boolean;
    centerMode: boolean;
    progressiveReveal: boolean;
}

export const LyricsPanel: React.FC = () => {
    const { state, dispatch } = usePlayer();
    const playerState = usePlayerState();
    const track = useCurrentTrack();
    const open = !!state.ui.showLyricsPanel;
    const editMode = !!state.ui.lyricsEditMode;

    const existing = track?.lyrics;
    const [draft, setDraft] = useState<string>(existing?.raw || '');

    // Sync draft when track changes
    useEffect(() => {
        setDraft(track?.lyrics?.raw || '');
    }, [track?.id]);

    // User experience toggles
    const [scrollCfg, setScrollCfg] = useState<ScrollConfig>({
        autoScroll: true,
        centerMode: true,
        progressiveReveal: false
    });

    // Optional offset (for manual fine tuning if LRC has slight delay)
    const [offset, setOffset] = useState<number>(0);

    // Parse lines
    const lines = existing?.lines;
    const synced = useSyncedLyrics(lines, playerState.position, {
        offset,
        disabled: editMode // disable sync while editing
    });

    // Refs for lines to scroll into view
    const lineRefs = useRef<(HTMLLIElement | null)[]>([]);
    lineRefs.current = [];

    const containerRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Focus textarea in edit mode
    useEffect(() => {
        if (open && editMode && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [open, editMode]);

    // Auto-scroll effect when activeIndex changes
    useEffect(() => {
        if (!scrollCfg.autoScroll || !lines || synced.activeIndex < 0) return;
        const el = lineRefs.current[synced.activeIndex];
        if (!el || !containerRef.current) return;

        if (scrollCfg.centerMode) {
            el.scrollIntoView({
                block: 'center',
                behavior: 'smooth'
            });
        } else {
            const parent = containerRef.current;
            const rect = el.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();
            if (rect.top < parentRect.top + 40 || rect.bottom > parentRect.bottom - 40) {
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [synced.activeIndex, scrollCfg.autoScroll, scrollCfg.centerMode, lines]);

    const closePanel = useCallback(() => {
        dispatch({
            type: 'SET_UI',
            patch: { showLyricsPanel: false, lyricsEditMode: false }
        });
    }, [dispatch]);

    const enterEdit = () => {
        setDraft(existing?.raw || '');
        dispatch({
            type: 'SET_UI',
            patch: { lyricsEditMode: true }
        });
    };

    const cancelEdit = () => {
        setDraft(existing?.raw || '');
        dispatch({
            type: 'SET_UI',
            patch: { lyricsEditMode: false }
        });
    };

    const save = () => {
        if (!track) return;
        const raw = draft.trim();
        if (!raw) {
            dispatch({
                type: 'UPDATE_TRACK',
                trackId: track.id,
                patch: { lyrics: undefined }
            });
            dispatch({
                type: 'SET_UI',
                patch: { lyricsEditMode: false }
            });
            return;
        }
        const { format, lines } = parseLyrics(raw);
        dispatch({
            type: 'UPDATE_TRACK',
            trackId: track.id,
            patch: {
                lyrics: {
                    raw,
                    format,
                    lines,
                    updatedAt: Date.now()
                }
            }
        });
        dispatch({
            type: 'SET_UI',
            patch: { lyricsEditMode: false }
        });
    };

    const toggleProgressive = () =>
        setScrollCfg(cfg => ({ ...cfg, progressiveReveal: !cfg.progressiveReveal }));

    const toggleAutoScroll = () =>
        setScrollCfg(cfg => ({ ...cfg, autoScroll: !cfg.autoScroll }));

    const toggleCenterMode = () =>
        setScrollCfg(cfg => ({ ...cfg, centerMode: !cfg.centerMode }));

    const isLRC = existing?.format === 'lrc' && synced.timed;

    const visibleLines = useMemo(() => {
        if (!lines) return [];
        if (!scrollCfg.progressiveReveal || synced.activeIndex < 0 || !isLRC)
            return lines;
        return lines.filter((_, i) => {
            // Show all untimed lines or those whose index <= active
            if (lines[i].time == null) return true;
            return i <= synced.activeIndex;
        });
    }, [lines, scrollCfg.progressiveReveal, synced.activeIndex, isLRC]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 md:inset-auto md:bottom-0 md:left-0 md:right-0 md:h-[55%] bg-bg-base/95 backdrop-blur
                 border-t border-border/40 z-40 flex flex-col shadow-xl animate-fade-in"
            role="dialog"
            aria-label="Lyrics Panel"
        >
            <header className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div className="flex flex-col">
                    <h2 className="text-sm font-semibold">
                        Lyrics {track ? `— ${track.title}` : ''}
                    </h2>
                    {track?.artist && (
                        <span className="text-[11px] text-text-mute">{track.artist}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!editMode && existing && isLRC && (
                        <>
                            <button
                                className="btn-ghost h-8 px-3 text-[12px]"
                                onClick={toggleAutoScroll}
                                title="Toggle auto-scroll"
                            >
                                {scrollCfg.autoScroll ? (
                                    <>
                                        <EyeOff className="h-4 w-4 mr-1" /> Auto-scroll
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-4 w-4 mr-1" /> Auto-scroll
                                    </>
                                )}
                            </button>
                            <button
                                className="btn-ghost h-8 px-3 text-[12px]"
                                onClick={toggleCenterMode}
                                title="Toggle center vs nearest scroll"
                            >
                                <ArrowUpCircle className="h-4 w-4 mr-1" />
                                {scrollCfg.centerMode ? 'Center' : 'Nearest'}
                            </button>
                            <button
                                className={`btn-ghost h-8 px-3 text-[12px] ${scrollCfg.progressiveReveal ? 'text-accent' : ''
                                    }`}
                                onClick={toggleProgressive}
                                title="Progressive reveal"
                            >
                                {scrollCfg.progressiveReveal ? 'Reveal On' : 'Reveal Off'}
                            </button>
                            <div className="flex items-center gap-1 ml-2">
                                <label className="text-[10px] uppercase tracking-wide text-text-mute">
                                    Offset
                                </label>
                                <input
                                    type="number"
                                    step={0.05}
                                    value={offset}
                                    onChange={(e) => setOffset(parseFloat(e.target.value) || 0)}
                                    className="w-16 bg-bg-soft border border-border/40 rounded px-1 py-0.5 text-[11px]"
                                    title="Timing offset (seconds; negative => earlier)"
                                />
                            </div>
                        </>
                    )}
                    {!editMode && (
                        <button
                            className="btn-ghost h-8 px-3 text-[12px]"
                            onClick={enterEdit}
                            disabled={!track}
                            title="Edit lyrics"
                        >
                            <Edit3 className="h-4 w-4 mr-1" />
                            {existing ? 'Edit' : 'Add'}
                        </button>
                    )}
                    {editMode && (
                        <>
                            <button
                                className="btn-ghost h-8 px-3 text-[12px]"
                                onClick={cancelEdit}
                                title="Cancel edit"
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-accent h-8 px-3 text-[12px]"
                                onClick={save}
                                title="Save lyrics"
                            >
                                <Save className="h-4 w-4 mr-1" />
                                Save
                            </button>
                        </>
                    )}
                    <button
                        className="icon-btn"
                        aria-label="Close lyrics"
                        onClick={closePanel}
                        title="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </header>

            <div
                ref={containerRef}
                className="flex-1 overflow-auto p-4 relative scroll-smooth"
            >
                {!track && (
                    <p className="text-sm text-text-mute">No track selected.</p>
                )}

                {track && !editMode && !existing && (
                    <div className="text-sm text-text-mute space-y-3">
                        <p>No lyrics yet.</p>
                        <button
                            className="btn-outline text-[12px] h-8 px-3"
                            onClick={enterEdit}
                        >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Add Lyrics
                        </button>
                    </div>
                )}

                {track && editMode && (
                    <div className="flex flex-col gap-3">
                        <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">
                            Paste plain text or LRC (time-tagged) lyrics
                        </label>
                        <textarea
                            ref={textareaRef}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            className="w-full min-h-[240px] resize-vertical rounded-md bg-bg-soft border border-border/40 p-3 text-sm font-mono leading-relaxed outline-none focus:ring-2 focus:ring-accent/40"
                            placeholder={`Example (plain):

Line one
Line two

OR LRC:

[00:12.10]First line
[00:18.22]Second line`}
                        />
                        <div className="flex justify-between text-[11px] text-text-mute">
                            <p>Supports plain text & LRC</p>
                            <p className="flex items-center gap-1">
                                <CornerDownLeft className="h-3 w-3" />
                                Save to apply
                            </p>
                        </div>
                    </div>
                )}

                {track && !editMode && existing && (
                    <div className="space-y-2">
                        {existing.format === 'lrc' ? (
                            <ul className="space-y-1 relative">
                                {visibleLines.map((l, i) => {
                                    const active = i === synced.activeIndex;
                                    const reached =
                                        synced.activeIndex >= 0 && i <= synced.activeIndex;
                                    return (
                                        <li
                                            key={i}
                                            ref={el => (lineRefs.current[i] = el)}
                                            className={[
                                                'text-sm leading-snug flex gap-3 transition-colors duration-150',
                                                l.time != null
                                                    ? 'tabular-nums'
                                                    : 'pl-10', // indent plain lines
                                                active
                                                    ? 'text-accent font-semibold'
                                                    : reached
                                                        ? 'text-text'
                                                        : 'text-text-mute/70',
                                                'hover:text-text-dim'
                                            ].join(' ')}
                                        >
                                            {l.time != null && (
                                                <span
                                                    className={[
                                                        'text-[10px] w-12 text-right select-none',
                                                        active ? 'text-accent' : 'text-text-mute'
                                                    ].join(' ')}
                                                >
                                                    {formatTimestamp(l.time)}
                                                </span>
                                            )}
                                            <span className="flex-1 whitespace-pre-wrap">
                                                {l.text || ' '}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                                {existing.lines.map((l, i) => (
                                    <p key={i}>{l.text}</p>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

function formatTimestamp(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}
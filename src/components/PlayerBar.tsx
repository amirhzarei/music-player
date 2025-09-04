import React, { useCallback } from 'react';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Shuffle,
    Repeat,
    Repeat1,
    FileText,
    FastForward
} from 'lucide-react';
import {
    usePlayerControls,
    usePlayerState,
    useCurrentTrack,
    usePlayer
} from '../state/playerState.js';
import { formatTime } from '../utils/time.js';
import { WaveformProgress } from './WaveformProgress.js';
import { CurrentLyricTicker } from './CurrentLyricTicker.js';

export const PlayerBar: React.FC = () => {
    const state = usePlayerState();
    const { dispatch } = usePlayer();
    const track = useCurrentTrack();
    const {
        play,
        pause,
        next,
        prev,
        toggleMute,
        setVolume,
        toggleShuffle,
        cycleRepeat
    } = usePlayerControls();

    const playing = state.status === 'playing';
    const loading = state.status === 'loading';

    const handlePlayPause = useCallback(() => {
        if (loading) return;
        if (playing) pause();
        else play();
    }, [playing, pause, play, loading]);

    const onVolumeChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setVolume(parseFloat(e.target.value));
        },
        [setVolume]
    );

    const repeatIcon =
        state.repeatMode === 'one' ? (
            <Repeat1 className="h-4 w-4" />
        ) : (
            <Repeat className="h-4 w-4" />
        );

    const toggleLyricsPanel = () => {
        dispatch({
            type: 'SET_UI',
            patch: {
                showLyricsPanel: !state.ui.showLyricsPanel,
                lyricsEditMode: false
            }
        });
    };

    const toggleGapless = () => {
        dispatch({
            type: 'SET_UI',
            patch: { gaplessEnabled: !state.ui.gaplessEnabled }
        });
    };

    const toggleLyricInBar = () => {
        dispatch({
            type: 'SET_UI',
            patch: { showLyricInBar: !state.ui.showLyricInBar }
        });
    };

    return (
        <div className="panel p-4 flex flex-col gap-3">
            {/* Track Info + buttons */}
            <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-md bg-bg-softer flex items-center justify-center text-xs text-text-mute overflow-hidden">
                    {track?.artwork ? (
                        <img
                            src={track.artwork}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        '—'
                    )}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm font-medium">
                        {track ? track.title : 'No Track Selected'}
                    </span>
                    <span className="text-[11px] text-text-mute truncate">
                        {track?.artist || (track ? 'Unknown Artist' : 'Load tracks to start')}
                    </span>
                    {track?.album && (
                        <span className="text-[10px] text-text-mute truncate">
                            {track.album}
                        </span>
                    )}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        className={`icon-btn ${state.ui.showLyricInBar ? 'text-accent' : ''}`}
                        aria-label="Toggle lyric ticker"
                        title="Lyric ticker"
                        onClick={toggleLyricInBar}
                    >
                        <FileText className="h-5 w-5" />
                    </button>
                    <button
                        className={`icon-btn ${state.ui.gaplessEnabled ? 'text-accent' : ''}`}
                        aria-label="Toggle gapless playback"
                        title={`Gapless preload (${state.ui.gaplessEnabled ? 'On' : 'Off'})`}
                        onClick={toggleGapless}
                    >
                        <FastForward className="h-5 w-5" />
                    </button>
                    <button
                        className={`icon-btn ${state.ui.showLyricsPanel ? 'text-accent' : ''}`}
                        aria-label="Open lyrics panel (L)"
                        title="Lyrics panel (L)"
                        onClick={toggleLyricsPanel}
                    >
                        <FileText className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Lyric ticker (compact) */}
            <CurrentLyricTicker className="mt-1" showNextDefault={false} />

            {/* Waveform / Progress */}
            <div className="flex flex-col gap-1">
                <WaveformProgress height={56} />
                <div className="flex justify-between text-[11px] text-text-mute font-medium mt-1">
                    <span>{formatTime(state.position)}</span>
                    <span>{formatTime(state.duration)}</span>
                </div>
            </div>

            {/* Transport / Volume */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1">
                    <button
                        className={`icon-btn ${state.shuffle ? 'text-accent' : ''}`}
                        aria-label="Toggle shuffle"
                        onClick={toggleShuffle}
                        title="Shuffle"
                    >
                        <Shuffle className="h-4 w-4" />
                    </button>
                    <button
                        className="icon-btn"
                        onClick={prev}
                        aria-label="Previous"
                        title="Previous Track"
                        disabled={!state.queue.length}
                    >
                        <SkipBack className="h-5 w-5" />
                    </button>
                    <button
                        className="icon-btn h-12 w-12 text-accent"
                        aria-label={playing ? 'Pause' : 'Play'}
                        onClick={handlePlayPause}
                        disabled={!track || loading}
                        title={loading ? 'Loading...' : playing ? 'Pause' : 'Play'}
                    >
                        {loading ? (
                            <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                        ) : playing ? (
                            <Pause className="h-7 w-7" />
                        ) : (
                            <Play className="h-7 w-7 pl-0.5" />
                        )}
                    </button>
                    <button
                        className="icon-btn"
                        onClick={next}
                        aria-label="Next"
                        title="Next Track"
                        disabled={!state.queue.length}
                    >
                        <SkipForward className="h-5 w-5" />
                    </button>
                    <button
                        className={`icon-btn ${state.repeatMode !== 'off' ? 'text-accent' : ''
                            }`}
                        onClick={cycleRepeat}
                        aria-label="Cycle repeat mode"
                        title={`Repeat: ${state.repeatMode}`}
                    >
                        {repeatIcon}
                    </button>
                </div>

                <div className="flex items-center gap-2 w-[180px]">
                    <button
                        className="icon-btn"
                        aria-label="Mute"
                        onClick={toggleMute}
                        title={state.muted ? 'Unmute' : 'Mute'}
                    >
                        {state.muted || state.volume === 0 ? (
                            <VolumeX className="h-4 w-4" />
                        ) : (
                            <Volume2 className="h-4 w-4" />
                        )}
                    </button>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={state.muted ? 0 : state.volume}
                        onChange={onVolumeChange}
                        className="w-full accent-accent cursor-pointer"
                        aria-label="Volume"
                    />
                </div>
            </div>
        </div>
    );
};
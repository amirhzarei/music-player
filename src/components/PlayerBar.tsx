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
    Repeat1
} from 'lucide-react';
import { useCurrentTrack, usePlayerControls, usePlayerState } from '../state/playerState.js';
import { ProgressBar } from './ProgressBar.js';
import { formatTime } from '../utils/time.js';

export const PlayerBar: React.FC = () => {
    const state = usePlayerState();
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

    const repeatIcon = state.repeatMode === 'one' ? (
        <Repeat1 className="h-4 w-4" />
    ) : (
        <Repeat className="h-4 w-4" />
    );

    return (
        <div className="panel p-4 flex flex-col gap-3">
            {/* Track Info */}
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
                </div>
            </div>

            {/* Progress */}
            <div className="flex flex-col gap-1">
                <ProgressBar />
                <div className="flex justify-between text-[11px] text-text-mute font-medium">
                    <span>{formatTime(state.position)}</span>
                    <span>{formatTime(state.duration)}</span>
                </div>
            </div>

            {/* Controls */}
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
                        className={`icon-btn ${state.repeatMode !== 'off' ? 'text-accent' : ''}`}
                        onClick={cycleRepeat}
                        aria-label="Cycle repeat mode"
                        title={`Repeat: ${state.repeatMode}`}
                    >
                        {repeatIcon}
                    </button>
                </div>

                {/* Volume */}
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
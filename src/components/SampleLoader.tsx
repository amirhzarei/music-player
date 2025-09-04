import React, { useCallback } from 'react';
import { Track } from '../state/types.js';
import { usePlayerControls, usePlayerState } from '../state/playerState.js';

/**
 * SampleLoader
 * Provides a quick way to add a small queue of royalty-free sample tracks
 * (You can replace with real track uploads or remote library later).
 *
 * For demonstration we use public domain / demo MP3 sample URLs.
 * NOTE: Replace these with properly licensed assets for production use.
 */

const SAMPLE_TRACKS: Omit<Track, 'id' | 'addedAt'>[] = [
    {
        title: 'Sample Piano',
        artist: 'Demo Artist',
        src: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Scott_Holmes_Music/Corporate__Motivational_Music_2/Scott_Holmes_Music_-_01_-_Driven_To_Success.mp3',
        artwork: '',
        type: 'audio/mpeg'
    },
    {
        title: 'Ambient Texture',
        artist: 'Demo Artist',
        src: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Monplaisir/Bright/Monplaisir_-_05_-_The_Dawn_of_Man.mp3',
        artwork: '',
        type: 'audio/mpeg'
    },
    {
        title: 'Soft Beat',
        artist: 'Demo Artist',
        src: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Ghostrifter_Official/Synthwave__Outrun/Ghostrifter_Official_-_05_-_Deflector.mp3',
        artwork: '',
        type: 'audio/mpeg'
    }
];

function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export const SampleLoader: React.FC = () => {
    const { queue } = usePlayerState();
    const { loadQueue, play } = usePlayerControls();

    const loadSamples = useCallback(() => {
        const now = Date.now();
        const tracks: Track[] = SAMPLE_TRACKS.map(t => ({
            ...t,
            id: uuid(),
            addedAt: now + Math.random() * 1000
        }));
        loadQueue(tracks, tracks[0].id);
        play();
    }, [loadQueue, play]);

    return (
        <div className="panel p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Sample Tracks</h3>
            <p className="text-[12px] text-text-mute leading-relaxed">
                Load a short demo playlist to test playback, seeking, and controls.
                Replace this component later with upload/import functionality.
            </p>
            <button
                onClick={loadSamples}
                className="btn-primary h-9"
                disabled={queue.length > 0}
            >
                {queue.length ? 'Queue Loaded' : 'Load Demo Playlist'}
            </button>
            {queue.length > 0 && (
                <p className="text-[11px] text-text-dim">
                    Clear the playlist to re-enable loading.
                </p>
            )}
        </div>
    );
};
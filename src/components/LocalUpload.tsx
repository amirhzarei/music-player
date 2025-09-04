import React, { useCallback, useRef, useState } from 'react';
import { usePlayer, usePlayerControls } from '../state/playerState.js';
import type { Track } from '../state/types.js';

/**
 * LocalUpload (Drag & Drop + File Picker)
 *
 * Adds local audio files to the existing queue using only existing actions.
 * (We reuse LOAD_QUEUE to avoid introducing new reducer action types.)
 *
 * Design choices:
 *  - Object URLs are created for each file (URL.createObjectURL).
 *  - We do NOT attempt to extract ID3 metadata (would require extra lib).
 *  - Title defaults to filename without extension.
 *  - Artist defaults to "Local File".
 *  - Duration is initially unknown (Playlist will show blank). Could be
 *    enhanced later by preloading an <audio> element to read metadata
 *    and then dispatching a new UPDATE_TRACK action (not yet added).
 *  - If there is no current track selected before adding, we set the
 *    first new track as current and (optionally) start playback.
 *
 * Cleanup:
 *  - If you want to reclaim memory after removing tracks, you could
 *    extend the reducer's REMOVE_TRACK handler to revoke blob URLs:
 *    if (track.src.startsWith('blob:')) URL.revokeObjectURL(track.src)
 *    (Not done here to avoid editing existing reducer.)
 */

function fileNameBase(name: string) {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
}

function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

interface LocalUploadProps {
    autoPlayFirst?: boolean;
    className?: string;
}

export const LocalUpload: React.FC<LocalUploadProps> = ({
    autoPlayFirst = true,
    className
}) => {
    const { state, dispatch } = usePlayer();
    const { play } = usePlayerControls();
    const [isDragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const addFiles = useCallback(
        (fileList: FileList | null) => {
            if (!fileList || fileList.length === 0) return;

            const now = Date.now();
            const newTracks: Track[] = Array.from(fileList)
                .filter(f => f.type.startsWith('audio/'))
                .map((file, i) => {
                    const objectUrl = URL.createObjectURL(file);
                    return {
                        id: uuid(),
                        title: fileNameBase(file.name),
                        artist: 'Local File',
                        src: objectUrl,
                        artwork: '',
                        type: file.type || 'audio/mpeg',
                        addedAt: now + i * 5,
                        // duration: undefined (unknown until loaded)
                    } as Track;
                });

            if (!newTracks.length) return;

            const newQueue = [...state.queue, ...newTracks];

            // Decide start track: if nothing was playing / selected before
            let startTrackId: string | undefined = state.currentTrackId;
            if (!state.currentTrackId) {
                startTrackId = newTracks[0].id;
            }

            dispatch({
                type: 'LOAD_QUEUE',
                queue: newQueue,
                startTrackId
            });

            if (autoPlayFirst && !state.currentTrackId) {
                play();
            }
        },
        [state.queue, state.currentTrackId, dispatch, play, autoPlayFirst]
    );

    const onFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            addFiles(e.target.files);
            // Reset input so selecting the same files again re-triggers onChange
            e.target.value = '';
        },
        [addFiles]
    );

    const openPicker = useCallback(() => {
        inputRef.current?.click();
    }, []);

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragging(false);
            addFiles(e.dataTransfer.files);
        },
        [addFiles]
    );

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
    }, []);

    return (
        <div
            className={`panel p-4 flex flex-col gap-3 relative transition ${isDragging ? 'ring-2 ring-accent/60 ring-offset-0' : ''
                } ${className || ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={onFileChange}
            />
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Local Files</h3>
                <button
                    className="btn-ghost h-8 px-3 text-xs"
                    onClick={openPicker}
                    type="button"
                >
                    Browse
                </button>
            </div>
            <p className="text-[12px] text-text-mute leading-relaxed">
                Drag &amp; drop audio files here or click Browse. Files are kept only in
                this session (persisted in localStorage as long as object URLs remain valid).
            </p>
            <div
                onClick={openPicker}
                className={`flex flex-col gap-2 items-center justify-center border border-dashed rounded-md cursor-pointer py-6 text-center text-[13px] ${isDragging
                    ? 'border-accent/70 bg-accent/10 text-accent'
                    : 'border-border/60 hover:border-border text-text-dim hover:text-text'
                    }`}
            >
                <span className="font-medium">
                    {isDragging ? 'Release to Add Files' : 'Drop Files or Click to Select'}
                </span>
                <span className="text-[11px] text-text-mute">
                    Supports common audio formats (mp3, wav, ogg, m4a…)
                </span>
            </div>
            {state.queue.length > 0 && (
                <p className="text-[11px] text-text-mute">
                    Queue length: {state.queue.length}
                    {state.currentTrackId
                        ? ''
                        : ' — (Select a track or press Play to start)'}
                </p>
            )}
        </div>
    );
};
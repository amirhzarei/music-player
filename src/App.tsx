import React from 'react';
import { PlayerBar } from './components/PlayerBar.js';
import { Playlist } from './components/Playlist.js';
import { LocalUpload } from './components/LocalUpload.js';
import clsx from 'clsx';
import { LyricsPanel } from './components/LyricsPanel.js';

/**
 * App Root (Updated)
 * Layout:
 *  - Left column: PlayerBar + SampleLoader + LocalUpload
 *  - Right column: Playlist
 *
 * Upcoming (if you choose next media):
 *  - Media Session API integration
 *  - Keyboard shortcuts
 */

const App: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1 flex items-start justify-center px-4 py-8">
                <div
                    className={clsx(
                        'w-full max-w-5xl grid gap-6',
                        'lg:grid-cols-[minmax(0,1fr)_340px]'
                    )}
                >
                    <div className="flex flex-col gap-6">
                        <PlayerBar />
                        {/* <SampleLoader /> */}
                        <LocalUpload />
                    </div>
                    <div className="flex flex-col gap-6">
                        <Playlist className="flex-1" />
                    </div>
                    <LyricsPanel />
                </div>
            </main>
            <footer className="py-4 text-center text-[11px] text-text-mute">
                Simple Music Player – Prototype (State + Engine Integrated)
            </footer>
        </div>
    );
};

export default App;
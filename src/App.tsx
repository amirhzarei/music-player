import React from 'react';
import clsx from 'clsx';
import { PlayerBar } from './components/PlayerBar.js';
import { SampleLoader } from './components/SampleLoader.js';
import { Playlist } from './components/Playlist.js';

/**
 * App Root (Updated)
 * Layout:
 *  - Left column: PlayerBar + SampleLoader stacked
 *  - Right column: Playlist
 *
 * Future Enhancements:
 *  - Drag & drop file uploads
 *  - Persistence (load last session)
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
                        <SampleLoader />
                    </div>
                    <div className="flex flex-col gap-6">
                        <Playlist className="flex-1" />
                    </div>
                </div>
            </main>
            <footer className="py-4 text-center text-[11px] text-text-mute">
                Simple Music Player – Prototype (State + Engine Integrated)
            </footer>
        </div>
    );
};

export default App;
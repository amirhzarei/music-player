import React from 'react';
import ReactDOM from 'react-dom/client';

import './styles/base.css';
import { PlayerProvider } from './state/playerState.js';
import { AudioEngineBinding } from './hooks/useAudioEngineBinding.js';
import App from './App.js';

/**
 * Root entry.
 *
 * Added:
 * - PlayerProvider (global player state / reducer)
 * - AudioEngineBinding (syncs state <-> audio element)
 *
 * Upcoming:
 * - Persistence hook (e.g., usePlayerPersistence) to load/save queue + last session.
 * - Media Session API hook (useMediaSession) for OS integration.
 * - Service worker registration (pwa/registerSW.ts) after PWA phase starts.
 */

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <PlayerProvider>
            <AudioEngineBinding />
            <App />
        </PlayerProvider>
    </React.StrictMode>
);
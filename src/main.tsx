import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/base.css';
import { PlayerProvider } from './state/playerState.js';
import { AudioEngineBinding } from './hooks/useAudioEngineBinding.js';
import App from './App.js';
import { PlayerPersistence } from './hooks/usePlayerPersistence.js';
import { MediaSessionBinding } from './hooks/useMediaSession.js';
import { KeyboardShortcutsBinding } from './hooks/useKeyboardShortcuts.js';
import { MetadataScannerBinding } from './hooks/useMetadataScanner.js';
import { WaveformScannerBinding } from './hooks/useWaveformScanner.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

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
        <ErrorBoundary>
            <PlayerProvider>
                <AudioEngineBinding />
                <PlayerPersistence />
                <MediaSessionBinding />
                <KeyboardShortcutsBinding />
                <MetadataScannerBinding />
                <WaveformScannerBinding />
                <App />
            </PlayerProvider>
        </ErrorBoundary>
    </React.StrictMode>
);
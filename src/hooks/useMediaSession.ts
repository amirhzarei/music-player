import { useEffect, useRef } from "react";
import {
  usePlayerState,
  usePlayerControls,
  useCurrentTrack,
} from "../state/playerState.js";

/**
 * useMediaSession
 * Integrates with the Media Session API (if available).
 *
 * Notes:
 *  - Some browsers / TS lib versions may not have full action typings (e.g. 'seekto').
 *    We defensively cast when needed.
 *  - We changed the handlers array to an array of objects instead of tuples to fix
 *    the TypeScript error you encountered.
 */

const SEEK_STEP = 10; // seconds
const POSITION_UPDATE_INTERVAL = 1000; // ms throttle publish

function safeMediaSession(): MediaSession | null {
  if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
    return (navigator as any).mediaSession as MediaSession;
  }
  return null;
}

export function useMediaSession() {
  const state = usePlayerState();
  const track = useCurrentTrack();
  const { play, pause, next, prev, seek } = usePlayerControls();

  const lastPosPublishRef = useRef(0);

  // Update metadata & playback state when track/status changes
  useEffect(() => {
    const ms = safeMediaSession();
    if (!ms) return;

    try {
      if (track) {
        const artwork: MediaImage[] = track.artwork
          ? [
              { src: track.artwork, sizes: "512x512", type: "image/png" },
              { src: track.artwork, sizes: "256x256", type: "image/png" },
            ]
          : [];
        ms.metadata = new MediaMetadata({
          title: track.title || "Unknown Title",
          artist: track.artist || "Unknown Artist",
          album: "Playlist",
          artwork,
        });
      } else {
        ms.metadata = new MediaMetadata({
          title: "No Track",
          artist: "",
          album: "",
          artwork: [],
        });
      }
    } catch {
      /* ignore metadata errors */
    }

    try {
      (ms as any).playbackState =
        state.status === "playing" ? "playing" : "paused";
    } catch {
      /* some browsers may not support playbackState */
    }
  }, [track, state.status]);

  // Action handlers
  useEffect(() => {
    const ms = safeMediaSession();
    if (!ms) return;

    // We use objects here (not tuples) to satisfy the declared type.
    const handlers: {
      action: MediaSessionAction | string;
      handler: MediaSessionActionHandler | null;
    }[] = [
      { action: "play", handler: () => play() },
      { action: "pause", handler: () => pause() },
      { action: "previoustrack", handler: () => prev() },
      { action: "nexttrack", handler: () => next() },
      {
        action: "seekforward",
        handler: () => {
          if (state.duration) {
            seek(Math.min(state.position + SEEK_STEP, state.duration));
          }
        },
      },
      {
        action: "seekbackward",
        handler: () => {
          seek(Math.max(0, state.position - SEEK_STEP));
        },
      },
      {
        // Some TS lib versions define 'seekto'; if not, we still pass the string.
        action: "seekto",
        handler: (e: MediaSessionActionDetails) => {
          if (!e) return;
          if (typeof e.seekTime === "number") {
            seek(
              Math.max(0, Math.min(e.seekTime, state.duration || e.seekTime))
            );
          }
        },
      },
    ];

    handlers.forEach(({ action, handler }) => {
      try {
        // Casting action to any to avoid strict literal type mismatches across TS lib versions
        ms.setActionHandler(action as any, handler);
      } catch {
        /* ignore unsupported actions */
      }
    });

    return () => {
      handlers.forEach(({ action }) => {
        try {
          ms.setActionHandler(action as any, null);
        } catch {
          /* ignore */
        }
      });
    };
  }, [play, pause, next, prev, seek, state.position, state.duration]);

  // Publish position state (throttled)
  useEffect(() => {
    const ms = safeMediaSession();
    if (!ms) return;
    const setPos = (ms as any).setPositionState;
    if (typeof setPos !== "function") return;

    const now = Date.now();
    if (now - lastPosPublishRef.current < POSITION_UPDATE_INTERVAL) return;
    lastPosPublishRef.current = now;

    if (state.duration > 0) {
      try {
        setPos.call(ms, {
          duration: state.duration,
          position: Math.min(state.position, state.duration),
          playbackRate: 1,
        });
      } catch {
        /* ignore */
      }
    }
  }, [state.position, state.duration, state.status]);
}

export const MediaSessionBinding: React.FC = () => {
  useMediaSession();
  return null;
};

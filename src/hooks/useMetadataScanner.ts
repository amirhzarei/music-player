import { useEffect, useRef } from 'react';
import { usePlayer } from '../state/playerState.js';
import type { Track } from '../state/types.js';
import { parseBlob } from 'music-metadata';

const PLACEHOLDER_ARTIST = 'Local File';

interface ArtworkCandidate {
  dataUrl: string;
}

function fileNameBase(name: string) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = () => rej(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function artworkToDataUrl(picture: { data: Uint8Array; format: string }): Promise<ArtworkCandidate | null> {
  try {
    // Create a fresh Uint8Array backed by a regular ArrayBuffer to ensure compatibility with BlobPart
    const bytes = new Uint8Array(picture.data);
    const blob = new Blob([bytes.buffer], { type: picture.format || 'image/jpeg' });
    const dataUrl = await blobToDataUrl(blob);
    return { dataUrl };
  } catch {
    return null;
  }
}

export function useMetadataScanner() {
  const { state, dispatch } = usePlayer();
  const scanningRef = useRef(false);
  const doneRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (scanningRef.current) return;

    const candidates = state.queue.filter(t => {
      if (doneRef.current.has(t.id)) return false;
      if (!t.src.startsWith('blob:')) return false;
      const needs =
        typeof t.duration !== 'number' ||
        t.artist === PLACEHOLDER_ARTIST ||
        !t.title ||
        !t.artwork;
      return needs;
    });

    if (!candidates.length) return;

    scanningRef.current = true;

    const run = async () => {
      for (const track of candidates) {
        try {
          const resp = await fetch(track.src);
          const blob = await resp.blob();

          const metadata = await parseBlob(blob).catch(() => null);
          if (!metadata) {
            doneRef.current.add(track.id);
            continue;
          }

          const patch: Partial<Track> = {};

          if (metadata.format.duration && !track.duration) {
            patch.duration = metadata.format.duration;
          }

          const common = metadata.common || {};

          if (common.title && track.title === fileNameBase(track.title)) {
            patch.title = common.title;
          }
          if (common.artist && track.artist === PLACEHOLDER_ARTIST) {
            patch.artist = common.artist;
          }
          if (common.album) {
            patch.album = common.album;
          }

          if (!track.artwork && Array.isArray(common.picture) && common.picture.length) {
            const pic = common.picture[0];
            const art = await artworkToDataUrl({
              data: pic.data as unknown as Uint8Array,
              format: pic.format || 'image/jpeg'
            });
            if (art) {
              patch.artwork = art.dataUrl;
            }
          }

          if (Object.keys(patch).length) {
            dispatch({ type: 'UPDATE_TRACK', trackId: track.id, patch });
          }

          doneRef.current.add(track.id);
        } catch {
          doneRef.current.add(track.id);
        }
      }
      scanningRef.current = false;
    };

    run();
  }, [state.queue, dispatch]);
}

export const MetadataScannerBinding: React.FC = () => {
  useMetadataScanner();
  return null;
};
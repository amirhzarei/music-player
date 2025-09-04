# Simple Music Player PWA (React + TypeScript + Tailwind)

Implements the Figma design:  
https://figma.com/design/3CRrdX8QpOeeOp9wqsDuq3/Simple-Music-Player--Community-?node-id=0-1&p=f&m=dev

Goal: A clean, lightweight, installable Progressive Web App music player with offline-ready shell, local playlist persistence, and smooth micro-interactions — built to learn core PWA + modern React fundamentals without extra framework noise.

## Stack (Chosen)

- React 18 + TypeScript
- Vite (fast dev + build)
- Tailwind CSS (utility-first styling)
- framer-motion (micro animations / transitions)
- lucide-react (icons)
- idb (IndexedDB helper for persistence)
- clsx (conditional class names)
- Hand-written Service Worker + Web App Manifest (learn fundamentals first)
- No router initially (single screen + layered panels)
- Optional later: @vite-pwa/plugin, zod, waveform/visualization libs

## Core Features (Initial Scope)

- Playback: play / pause / previous / next
- Track progress bar with drag seek
- Time display (current / duration)
- Playlist view + select track
- Add local tracks (file input) – optional Phase 6
- Persistence: last played track, position, playlist (IndexedDB)
- Shuffle + Repeat modes (later phase)
- Keyboard shortcuts (space, arrows, etc.)
- Media Session API integration (locks screen controls / OS integration)
- Installable PWA (manifest + service worker)
- Offline App Shell (UI loads even if tracks fail)
- Basic accessibility (ARIA labels + focus order)

## Stretch Goals

- Waveform or visualizer
- Drag & drop local files
- Editable metadata (title / artist)
- Theming (light/dark toggle) if design permits
- Download & cache chosen tracks for offline (user-controlled)
- Audio normalization / crossfade (advanced)
- Background sync for prefetching

## Project Structure (Planned)

```
/ (root)
  index.html
  manifest.webmanifest          (later)
  sw.js                         (service worker – later)
  /public/                      (icons, static assets)
  /src/
    main.tsx
    App.tsx
    components/
      PlayerBar/
        PlayerBar.tsx
        Controls.tsx
        ProgressBar.tsx
        VolumeControl.tsx        (later)
      Playlist/
        PlaylistPanel.tsx
        TrackItem.tsx
      Layout/
        Panel.tsx
        Surface.tsx
      Icons/ (re-exports lucide icons)
    hooks/
      useAudioController.ts
      useMediaSession.ts
      usePersistentState.ts
      useHotkeys.ts
    state/
      playerState.ts             (central store pattern using React + custom hook)
      types.ts
    lib/
      audioEngine.ts             (wrapping <audio>)
      idbClient.ts               (idb helpers)
      storageKeys.ts
    utils/
      time.ts                    (formatting mm:ss)
      array.ts                   (shuffle helper)
    styles/
      base.css                   (Tailwind layer extensions if needed)
    pwa/
      registerSW.ts              (SW registration)
    config/
      constants.ts               (app version, cache names)
```

We will only create files as they become necessary.

## Phase Roadmap

1. Skeleton & HTML structure
2. Tailwind base + tokens (color mapping from Figma)
3. Audio engine + simple test track (hardcoded)
4. Player state management (currentTrack, status, position)
5. Progress bar + seek drag
6. Playlist rendering + track switching
7. Persistence (IndexedDB: playlist + last session)
8. Media Session API integration
9. Service Worker + manifest (installable PWA)
10. Shuffle / Repeat modes
11. Keyboard accessibility + ARIA audit
12. Enhancements / polish / animations

## Data Model (Initial Thoughts)

```
Track {
  id: string
  title: string
  artist?: string
  src: string              (blob/object URL or remote URL)
  duration?: number        (captured after metadata load)
  artwork?: string         (optional image)
  addedAt: number
  local?: boolean          (user-provided)
}

PlayerState {
  queue: Track[]
  currentTrackId?: string
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'
  position: number          (seconds)
  buffered: number          (seconds or ratio)
  volume: number            (0..1)
  muted: boolean
  repeatMode: 'off' | 'one' | 'all'
  shuffle: boolean
}
```

## Styling Approach

- Tailwind for layout / spacing / colors.
- Minimal custom CSS reserved for:
  - Complex progress bar thumb styling
  - Focus ring enhancements
  - Motion preference adjustments (prefers-reduced-motion)
- Use arbitrary values only when tokens don’t fit — then consider adding to theme extension.

## Accessibility Checklist

- Each control has aria-label (Play, Pause, Next, Previous)
- Role="progressbar" with aria-valuemin/now/max
- Keyboard:
  - Space / Enter: toggle play
  - ArrowLeft / ArrowRight: seek ±5s
  - ArrowUp / ArrowDown: volume (later)
- Focus visible ring (custom but high contrast)
- Color contrast AA (verify once real palette extracted)

## Service Worker Strategy (Initial)

- Cache Name Pattern: app-shell-v1 / audio-v1 (version constant)
- Install: cache index.html, CSS, JS, icons
- Fetch Strategy:
  - App Shell: Cache-first
  - Audio: Network-first (optional toggle for caching)
- Cleanup old caches on activate
- Listen to 'message' for skipWaiting if we add updates UI

## Media Session Mapping

| Action            | Behavior                          |
|-------------------|-----------------------------------|
| previoustrack     | previous track or restart         |
| nexttrack         | next track                        |
| play              | play()                            |
| pause             | pause()                           |
| seekforward       | +10s                              |
| seekbackward      | -10s                              |
| seekto (optional) | set position from platform event  |

## Commands

```
npm run dev        # start
npm run build      # prod build
npm run preview    # preview build
npm run lint       # lint source
npm run typecheck  # type-only check
npm run format     # prettier format
```

## Icon & Manifest Plan (Later Phase)

- Generate 192, 256, 512, maskable icons (SVG → PNG)
- Theme color & background color from design
- Display mode: standalone
- Orientation: portrait
- Short name under 12 chars (e.g., "SimplePlayer")

## Learning Focus

- Understand how React subscriber components re-render from minimal central state
- Manage audio side-effects cleanly (no stale closures)
- Build a service worker manually before automating
- Inspect Lighthouse PWA score and iterate

## Next Steps

The project scaffolding continues file-by-file.  
Next file to be created: `src/main.tsx` (entry + mounting + Tailwind import).

Reply with: next  
(Or ask for changes to this README before proceeding.)

---
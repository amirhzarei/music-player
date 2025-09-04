import { useEffect, useMemo, useRef, useState } from "react";

export interface SyncedLine {
  time: number | null;
  text: string;
}

interface Options {
  /**
   * If provided, applies an offset (seconds) to matching logic.
   * Positive = show later, Negative = show earlier.
   */
  offset?: number;
  /**
   * Disable syncing (useful while user scrolls / editing).
   */
  disabled?: boolean;
}

/**
 * Efficiently determines the active lyric line index given the current playback position.
 * Only updates state when the active index actually changes to avoid re-renders every frame.
 */
export function useSyncedLyrics(
  lines: SyncedLine[] | undefined,
  position: number,
  options: Options = {}
) {
  const { offset = 0, disabled } = options;
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const lastIndexRef = useRef<number>(-1);

  // Precompute an array of times (only timed lines). Plain (null time) lines are ignored for syncing.
  const timedLines = useMemo(() => {
    if (!lines || !lines.length) return [];
    return lines
      .map((l, i) => (l.time != null ? { time: l.time, index: i } : null))
      .filter(Boolean) as { time: number; index: number }[];
  }, [lines]);

  useEffect(() => {
    if (disabled) return;
    if (!lines || !timedLines.length) {
      if (lastIndexRef.current !== -1) {
        lastIndexRef.current = -1;
        setActiveIndex(-1);
      }
      return;
    }

    const target = position + offset;

    // Fast path: if we are moving forward and next line is still ahead, keep current index.
    const lastIdx = lastIndexRef.current;
    if (lastIdx >= 0 && lastIdx < lines.length - 1) {
      const currentTimedPos = timedLines.find((t) => t.index === lastIdx)?.time;
      const nextTimed = timedLines.find((t) => t.index > lastIdx);
      if (
        currentTimedPos != null &&
        nextTimed &&
        target >= currentTimedPos &&
        target < nextTimed.time
      ) {
        return; // still within current line’s window
      }
    }

    // Binary search among timed lines to find the greatest time <= target.
    let lo = 0;
    let hi = timedLines.length - 1;
    let foundIdx = -1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const midTime = timedLines[mid].time;
      if (midTime <= target + 1e-6) {
        foundIdx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    const newActiveIndex = foundIdx === -1 ? -1 : timedLines[foundIdx].index;

    if (newActiveIndex !== lastIndexRef.current) {
      lastIndexRef.current = newActiveIndex;
      setActiveIndex(newActiveIndex);
    }
  }, [position, lines, timedLines, offset, disabled]);

  return {
    activeIndex,
    activeLine: activeIndex >= 0 ? lines?.[activeIndex] : undefined,
    timed: !!timedLines.length,
  };
}

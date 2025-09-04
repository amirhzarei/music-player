/**
 * time.ts
 *
 * Lightweight time utilities for the player UI.
 * Avoids external deps; keeps formatting stable and testable.
 */

/**
 * Format seconds into m:ss (no leading hours).
 * Examples:
 *  - 0        -> "0:00"
 *  - 7        -> "0:07"
 *  - 65       -> "1:05"
 *  - 3600+15  -> "60:15" (we deliberately roll hours into minutes for compactness)
 */
export function formatTime(seconds: number | undefined | null): string {
  if (seconds == null || !isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Extended formatter that returns h:mm:ss when hours > 0.
 * Examples:
 *  - 59          -> "0:59"
 *  - 65          -> "1:05"
 *  - 3605        -> "1:00:05"
 *  - 7261 (2h1s) -> "2:01:01"
 */
export function formatTimeExtended(seconds: number | undefined | null): string {
  if (seconds == null || !isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Parse a string like "1:23" or "01:02:03" into seconds.
 * Returns NaN on invalid input.
 */
export function parseTime(str: string): number {
  if (!str) return NaN;
  const parts = str
    .trim()
    .split(":")
    .map((p) => p.trim());
  if (parts.some((p) => p === "" || !/^\d+$/.test(p))) return NaN;
  if (parts.length === 1) {
    return Number(parts[0]);
  } else if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    if (s >= 60) return NaN;
    return m * 60 + s;
  } else if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    if (m >= 60 || s >= 60) return NaN;
    return h * 3600 + m * 60 + s;
  }
  return NaN;
}

/**
 * Clamp a value to [0, duration].
 */
export function clampPosition(pos: number, duration: number): number {
  if (!isFinite(pos)) return 0;
  return Math.min(Math.max(pos, 0), Math.max(duration, 0));
}

/**
 * Produce a progress ratio (0..1) from position & duration safely.
 */
export function progressRatio(position: number, duration: number): number {
  if (!duration || !isFinite(duration) || duration <= 0) return 0;
  return Math.min(1, Math.max(0, position / duration));
}

/**
 * Format a ratio (0..1) into a percentage string with given precision.
 * Example: ratioPercent(0.3456, 1) -> "34.6%"
 */
export function ratioPercent(ratio: number, precision = 1): string {
  const pct = (Math.min(1, Math.max(0, ratio)) * 100).toFixed(precision);
  return `${pct}%`;
}

/**
 * Human-friendly relative duration (approximate) for tooltips / accessibility.
 * - 62  -> "1 minute"
 * - 125 -> "2 minutes"
 * - 3700 -> "1 hour"
 */
export function approximateDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0 seconds";
  if (seconds < 60) {
    const s = Math.round(seconds);
    return `${s} second${s === 1 ? "" : "s"}`;
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    const m = Math.round(minutes);
    return `${m} minute${m === 1 ? "" : "s"}`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    const h = Math.round(hours);
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  const days = hours / 24;
  const d = Math.round(days);
  return `${d} day${d === 1 ? "" : "s"}`;
}

/* ---------- Simple Tests (Dev Convenience) ----------
 * (Remove or adapt to a formal test runner later.)
 */
if (import.meta?.env?.DEV) {
  // eslint-disable-next-line no-console
  console.debug("[time.ts] formatTime(65)=", formatTime(65)); // 1:05
}

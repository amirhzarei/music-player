/**
 * Lyrics utilities: detect LRC, parse, stringify, normalize.
 */

export interface ParsedLyricLine {
  time: number | null;
  text: string;
}

// Updated regex: allow . or : before fractional part, and enforce two-digit seconds
// Examples accepted: [00:04], [00:04.12], [00:04:12], [3:7.5]
const LRC_TIME_RE = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?]/g;

export function looksLikeLRC(raw: string): boolean {
  return /\[\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?]/.test(raw);
}

export interface ParsedLyricsResult {
  format: "plain" | "lrc";
  lines: ParsedLyricLine[];
}

export function parseLRC(raw: string): ParsedLyricLine[] {
  const lines = raw.split(/\r?\n/);
  const out: ParsedLyricLine[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    let match: RegExpExecArray | null;
    let times: number[] = [];
    LRC_TIME_RE.lastIndex = 0;
    while ((match = LRC_TIME_RE.exec(line))) {
      const m = parseInt(match[1], 10);
      const s = parseInt(match[2], 10);
      const fracRaw = match[3] || "";
      let fracValue = 0;

      if (fracRaw.length === 1) {
        // 1 digit => tenths
        fracValue = parseInt(fracRaw, 10) / 10;
      } else if (fracRaw.length === 2) {
        // 2 digits => centiseconds
        fracValue = parseInt(fracRaw, 10) / 100;
      } else if (fracRaw.length === 3) {
        // 3 digits => milliseconds
        fracValue = parseInt(fracRaw, 10) / 1000;
      }

      const total = m * 60 + s + fracValue;
      times.push(total);
    }

    // Remove all time tags from text
    const text = line.replace(LRC_TIME_RE, "").trim();

    if (times.length === 0) {
      // treat as plain/untimed
      out.push({ time: null, text: line.trim() });
    } else {
      if (!text) continue; // skip empty timed lines
      for (const t of times) {
        out.push({ time: t, text });
      }
    }
  }

  // Sort by time (timed lines first in chronological order; untimed at end)
  out.sort((a, b) => {
    if (a.time == null && b.time == null) return 0;
    if (a.time == null) return 1;
    if (b.time == null) return -1;
    return a.time - b.time;
  });

  return out;
}

export function parsePlain(raw: string): ParsedLyricLine[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => ({ time: null, text: l }));
}

export function parseLyrics(raw: string): ParsedLyricsResult {
  if (looksLikeLRC(raw)) {
    return { format: "lrc", lines: parseLRC(raw) };
  }
  return { format: "plain", lines: parsePlain(raw) };
}

export function formatLyricTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec - Math.floor(sec)) * 100); // centiseconds
  return `[${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(
    cs
  ).padStart(2, "0")}]`;
}

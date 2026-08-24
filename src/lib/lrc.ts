import { formatLrcTime } from "./utils";
import type { LyricLine, ProjectMeta } from "./types";

const LRC_LINE = /^\[(\d{1,3}):(\d{2}(?:\.\d{1,3})?)\](.*)$/;

export function toLrc(meta: ProjectMeta, lines: LyricLine[]): string {
  const header = [
    meta.title ? `[ti:${meta.title}]` : null,
    meta.artist ? `[ar:${meta.artist}]` : null,
    meta.album ? `[al:${meta.album}]` : null,
    meta.label ? `[by:${meta.label}]` : null,
    `[re:HoldCue]`,
  ]
    .filter(Boolean)
    .join("\n");

  const body = lines
    .filter((l) => l.start != null)
    .sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
    .map((l) => `[${formatLrcTime(l.start ?? 0)}]${l.text}`)
    .join("\n");

  return `${header}\n${body}\n`;
}

export function parseLrc(text: string): { tags: Record<string, string>; lines: { time: number; text: string }[] } {
  const tags: Record<string, string> = {};
  const lines: { time: number; text: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const tag = raw.match(/^\[(ti|ar|al|by|offset):(.+)\]$/i);
    if (tag) {
      tags[tag[1]!.toLowerCase()] = tag[2]!.trim();
      continue;
    }
    const m = raw.match(LRC_LINE);
    if (!m) continue;
    const min = Number(m[1]);
    const sec = Number(m[2]);
    const time = min * 60 + sec;
    const lyric = (m[3] ?? "").trim();
    if (!lyric) continue;
    lines.push({ time, text: lyric });
  }
  return { tags, lines };
}

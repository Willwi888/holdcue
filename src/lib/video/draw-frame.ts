import type {
  AnimStyle,
  LyricFont,
  LyricLine,
  LyricMotion,
  LyricSize,
  ProjectLink,
} from "@/lib/types";
import { seekIdent } from "@/lib/video/assets";

export type DrawMeta = {
  title: string;
  artist: string;
  album: string;
  subtitle: string;
  isrc: string;
  upc: string;
  releaseDate: string;
  label: string;
  links: ProjectLink[];
};

export type DrawFlags = {
  showCard: boolean;
  showMeta: boolean;
  showGraffiti: boolean;
  karaokeFill: boolean;
};

export type DrawState = {
  time: number;
  duration: number;
  lines: LyricLine[];
  meta: DrawMeta;
  style: AnimStyle;
  motion: LyricMotion;
  lyricFont: LyricFont;
  lyricSize: LyricSize;
  noiseSeconds: number;
  flags: DrawFlags;
  cover: HTMLImageElement | null;
  portrait: HTMLImageElement | null;
  withIdents?: boolean;
  identHead?: number;
  identTail?: number;
};

const ORANGE = "#e85a12";
const PAPER = "#f5f2ee";
const INK = "#0c0c0d";

const FONT_STACK: Record<LyricFont, string> = {
  sans: '"Noto Sans TC", sans-serif',
  serif: '"Noto Serif TC", "Noto Sans TC", serif',
  display: 'Syne, "Noto Sans TC", sans-serif',
  marker: '"Permanent Marker", "Noto Sans TC", cursive',
  mono: '"Share Tech Mono", ui-monospace, monospace',
};

const FONT_SCALE: Record<LyricSize, number> = {
  s: 0.84,
  m: 1,
  l: 1.24,
  xl: 1.5,
};

export const IDENT_HEAD = 6.84;
export const IDENT_TAIL = 8.6;

function fontFace(state: DrawState) {
  return FONT_STACK[state.lyricFont] ?? FONT_STACK.sans;
}

function fontScale(state: DrawState) {
  return FONT_SCALE[state.lyricSize] ?? 1;
}

function setLyricFont(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
  weight: number,
  base: number,
  s: number,
) {
  ctx.font = `${weight} ${base * s * fontScale(state)}px ${fontFace(state)}`;
}

export function findActive(
  lines: LyricLine[],
  time: number,
): { line: LyricLine; index: number; progress: number } | null {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.start == null || l.end == null) continue;
    if (time >= l.start && time <= l.end + 0.04) {
      const span = Math.max(0.12, l.end - l.start);
      const progress = clamp((time - l.start) / span, 0, 1);
      return { line: l, index: i, progress };
    }
  }
  let last: { line: LyricLine; index: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.start != null && time >= l.start) last = { line: l, index: i };
  }
  if (last && last.line.end != null && time < last.line.end + 0.8) {
    return { line: last.line, index: last.index, progress: 1 };
  }
  return null;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

const noiseTiles: HTMLCanvasElement[] = [];

function makeNoiseTile(size = 160): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const nctx = c.getContext("2d");
  if (!nctx) return c;
  const img = nctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 70 + Math.random() * 130;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  return c;
}

function grainStrength(time: number, duration: number, pad: number) {
  if (time < pad) return 0.28;
  if (time > duration - pad) return 0.28;
  return 0.12;
}

function drawLoopingGrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  duration: number,
  pad: number,
) {
  if (noiseTiles.length === 0) {
    for (let i = 0; i < 3; i++) noiseTiles.push(makeNoiseTile());
  }
  const tile = noiseTiles[Math.floor(time * 18) % noiseTiles.length]!;
  const loop = time * 40;
  const ox = Math.floor((loop * 173) % tile.width);
  const oy = Math.floor((loop * 97) % tile.height);
  ctx.save();
  ctx.globalAlpha = grainStrength(time, duration, pad);
  ctx.globalCompositeOperation = "overlay";
  for (let y = -oy; y < h + tile.height; y += tile.height) {
    for (let x = -ox; x < w + tile.width; x += tile.width) {
      ctx.drawImage(tile, x, y);
    }
  }
  ctx.restore();
}

function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
): boolean {
  const iw = video.videoWidth;
  const ih = video.videoHeight;
  if (iw < 2 || ih < 2) return false;
  const ir = iw / ih;
  const r = w / h;
  let sx = 0;
  let sy = 0;
  let sw = iw;
  let sh = ih;
  if (ir > r) {
    sw = ih * r;
    sx = (iw - sw) / 2;
  } else {
    sh = iw / r;
    sy = (ih - sh) / 2;
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
  return true;
}

function drawIdentBumper(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
  w: number,
  h: number,
): boolean {
  if (!state.withIdents) return false;
  const { time, duration } = state;
  const head = state.identHead ?? IDENT_HEAD;
  const tail = state.identTail ?? IDENT_TAIL;
  if (time < head) {
    const video = seekIdent("play", time);
    return Boolean(video && drawVideoCover(ctx, video, w, h));
  }
  if (duration > head + tail && time > duration - tail) {
    const video = seekIdent("out", time - (duration - tail));
    return Boolean(video && drawVideoCover(ctx, video, w, h));
  }
  return false;
}

type MotionPose = { x: number; y: number; alpha: number; text: string };

function lyricPose(
  motion: LyricMotion,
  progress: number,
  text: string,
  s: number,
): MotionPose {
  const enter = clamp(progress / 0.16, 0, 1);
  const leave = progress > 0.86 ? clamp((1 - progress) / 0.14, 0, 1) : 1;
  const a = Math.min(enter, leave);
  const ease = 1 - Math.pow(1 - enter, 3);
  if (motion === "slide") {
    return { x: (1 - ease) * -56 * s, y: 0, alpha: a, text };
  }
  if (motion === "fade") {
    return { x: 0, y: 0, alpha: a, text };
  }
  if (motion === "type") {
    const chars = [...text];
    const shown = chars
      .slice(0, Math.max(1, Math.ceil(chars.length * Math.max(0.04, progress))))
      .join("");
    return { x: 0, y: (1 - ease) * 10 * s, alpha: Math.max(a, 0.35), text: shown };
  }
  return { x: 0, y: (1 - ease) * 54 * s, alpha: a, text };
}

export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / Math.max(1, img.height);
  const r = w / Math.max(1, h);
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (ir > r) {
    sw = img.height * r;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / r;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  portrait: HTMLImageElement | null,
  cover: HTMLImageElement | null,
) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  const img = portrait ?? cover;
  if (!img) return;
  ctx.save();
  ctx.filter = "saturate(0.85) contrast(1.05)";
  drawCover(ctx, img, 0, 0, w, h);
  ctx.restore();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(8,8,9,0.18)");
  g.addColorStop(0.45, "rgba(8,8,9,0.28)");
  g.addColorStop(1, "rgba(8,8,9,0.62)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawAlbumCard(
  ctx: CanvasRenderingContext2D,
  cover: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = size * 0.12;
  ctx.fillStyle = "#111";
  ctx.fillRect(x, y, size, size);
  if (cover) drawCover(ctx, cover, x, y, size, size);
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

function drawGraffiti(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
) {
  if (!text) return;
  ctx.save();
  ctx.font = `${size}px "Permanent Marker", cursive`;
  ctx.fillStyle = ORANGE;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 8;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    ctx.fillText(words[0]!, x, y);
    ctx.fillText(words.slice(1).join(" "), x, y + size * 0.92);
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  if (!text) return [""];
  const chars = [...text];
  const lines: string[] = [];
  let cur = "";
  for (const ch of chars) {
    const next = cur + ch;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = ch.trimStart();
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [text];
}

function fillTextLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lh: number,
) {
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lh));
}

function drawMetaBlock(
  ctx: CanvasRenderingContext2D,
  meta: DrawMeta,
  x: number,
  y: number,
  s: number,
) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const rows: string[] = [];
  if (meta.title) rows.push(meta.title);
  if (meta.artist) rows.push(meta.artist);
  if (meta.isrc) rows.push(`ISRC  ${meta.isrc}`);
  if (meta.releaseDate) rows.push(formatRelease(meta.releaseDate));
  if (meta.label) rows.push(meta.label);
  if (rows.length === 0) return;
  rows.forEach((row, i) => {
    ctx.fillStyle = i === 0 ? PAPER : "rgba(245,242,238,0.72)";
    ctx.font =
      i === 0
        ? `600 ${13 * s}px "Noto Sans TC", sans-serif`
        : `500 ${11 * s}px "Noto Sans TC", sans-serif`;
    ctx.fillText(row, x, y + i * 18 * s);
  });
}

function formatRelease(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

function introOpacity(time: number, firstStart: number | null) {
  if (firstStart == null) return time < 4 ? 1 : 0;
  if (time >= firstStart) return 0;
  const fade = Math.min(1.2, firstStart * 0.3);
  if (time > firstStart - fade) return clamp((firstStart - time) / fade, 0, 1);
  return 1;
}

function outroActive(time: number, duration: number, lastEnd: number | null) {
  const start = lastEnd != null ? lastEnd + 1.4 : duration - 7;
  return time >= start;
}

export function drawFrame(ctx: CanvasRenderingContext2D, state: DrawState) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const s = h / 720;

  if (drawIdentBumper(ctx, state, w, h)) return;

  const head = state.withIdents ? (state.identHead ?? IDENT_HEAD) : 0;
  const tail = state.withIdents ? (state.identTail ?? IDENT_TAIL) : 0;
  const inner: DrawState = state.withIdents
    ? {
        ...state,
        time: Math.max(0, state.time - head),
        duration: Math.max(0.1, state.duration - head - tail),
      }
    : state;

  const { time, duration, lines, style } = inner;
  const active = findActive(lines, time);
  const timed = lines.filter((l) => l.start != null);
  const firstStart = timed[0]?.start ?? null;
  const lastEnd = timed.reduce<number | null>(
    (acc, l) => (l.end == null ? acc : acc == null ? l.end : Math.max(acc, l.end)),
    null,
  );

  if (style === "karaoke") drawKaraoke(ctx, inner, active, s);
  else if (style === "center") drawCenter(ctx, inner, active, s);
  else if (style === "typewriter") drawTypewriter(ctx, inner, active, s);
  else if (style === "lowerThird") drawLowerThird(ctx, inner, active, s);
  else if (style === "credits") drawCredits(ctx, inner, active, s);
  else drawCinematic(ctx, inner, active, s, w, h, firstStart, lastEnd, duration);

  drawLoopingGrain(ctx, w, h, time, duration, inner.noiseSeconds);
}

function drawCinematic(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
  active: ReturnType<typeof findActive>,
  s: number,
  w: number,
  h: number,
  firstStart: number | null,
  lastEnd: number | null,
  duration: number,
) {
  const { meta, flags, cover, portrait, time } = state;
  drawBg(ctx, w, h, portrait, cover);

  const cardSize = 188 * s;
  const cardX = w - cardSize - 48 * s;
  const cardY = 42 * s;
  const album = meta.album || meta.title;
  const words = album.trim().split(/\s+/).filter(Boolean).length;

  if (flags.showGraffiti) {
    drawGraffiti(
      ctx,
      album,
      28 * s,
      h - (words > 1 ? 168 * s : 88 * s),
      72 * s,
    );
  }

  if (flags.showCard) {
    drawAlbumCard(ctx, cover, cardX, cardY, cardSize);
  }
  if (flags.showMeta) {
    drawMetaBlock(ctx, meta, cardX, cardY + cardSize + 22 * s, s);
  }

  const io = introOpacity(time, firstStart);
  if (io > 0.02 && !active) {
    ctx.save();
    ctx.globalAlpha = io;
    ctx.fillStyle = PAPER;
    setLyricFont(ctx, state, 600, 44, s);
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    const title = meta.subtitle || meta.title;
    const wrapped = wrapText(ctx, title, w * 0.52);
    const lh = 56 * s * fontScale(state);
    const y0 = h * 0.46 - ((wrapped.length - 1) * lh) / 2;
    fillTextLines(ctx, wrapped, 64 * s, y0, lh);
    ctx.font = `500 ${18 * s}px Syne, sans-serif`;
    ctx.fillStyle = "rgba(245,242,238,0.7)";
    ctx.fillText(
      [meta.artist, meta.title].filter(Boolean).join("  ·  "),
      64 * s,
      y0 + wrapped.length * lh + 18 * s,
    );
    ctx.restore();
  }

  if (active) {
    const pose = lyricPose(state.motion, active.progress, active.line.text, s);
    ctx.save();
    ctx.globalAlpha = pose.alpha;
    ctx.fillStyle = PAPER;
    setLyricFont(ctx, state, 500, 40, s);
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 16 * s;
    const maxW = w * 0.54;
    const wrapped = wrapText(ctx, pose.text, maxW);
    const lh = 52 * s * fontScale(state);
    const y0 = h * 0.42 - ((wrapped.length - 1) * lh) / 2 + pose.y;
    const x = 64 * s + pose.x;
    fillTextLines(ctx, wrapped, x, y0, lh);
    if (state.flags.karaokeFill && state.motion !== "type" && active.progress < 1) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = ORANGE;
      const totalChars = active.line.text.length || 1;
      const shown = Math.floor(totalChars * active.progress);
      const partial = active.line.text.slice(0, shown);
      const partialLines = wrapText(ctx, partial, maxW);
      fillTextLines(ctx, partialLines, x, y0, lh);
    }
    ctx.restore();
  }

  if (outroActive(time, duration, lastEnd) && !active) {
    drawEndCard(ctx, state, s, w, h);
  }
}

function drawEndCard(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
  s: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = "rgba(8,8,9,0.32)";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PAPER;
  ctx.font = `600 ${28 * s}px "Noto Sans TC", sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(state.meta.title || "Untitled", 64 * s, h * 0.42);
  ctx.font = `500 ${16 * s}px Syne, sans-serif`;
  ctx.fillStyle = "rgba(245,242,238,0.7)";
  ctx.fillText(
    [state.meta.artist, state.meta.album].filter(Boolean).join("  ·  "),
    64 * s,
    h * 0.42 + 36 * s,
  );
}

function drawKaraoke(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
  active: ReturnType<typeof findActive>,
  s: number,
) {
  const { cover, portrait, lines, meta, flags } = state;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  const img = portrait ?? cover;
  if (img) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.filter = "grayscale(1) blur(18px)";
    drawCover(ctx, img, 0, 0, w, h);
    ctx.restore();
  }
  if (flags.showCard && cover) {
    drawAlbumCard(ctx, cover, 48 * s, 40 * s, 96 * s);
    ctx.fillStyle = PAPER;
    ctx.font = `600 ${18 * s}px "Noto Sans TC", sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(meta.title, 160 * s, 52 * s);
    ctx.fillStyle = "rgba(245,242,238,0.55)";
    ctx.font = `400 ${13 * s}px Syne, sans-serif`;
    ctx.fillText(meta.artist, 160 * s, 80 * s);
  }
  const idx = active?.index ?? -1;
  const windowStart = Math.max(0, idx - 2);
  const vis = lines.slice(windowStart, windowStart + 7);
  vis.forEach((line, i) => {
    const abs = windowStart + i;
    const isCur = abs === idx;
    const y = h * 0.28 + i * 58 * s * Math.max(0.92, fontScale(state));
    setLyricFont(ctx, state, isCur ? 600 : 400, isCur ? 32 : 22, s);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isCur ? PAPER : "rgba(245,242,238,0.28)";
    ctx.fillText(line.text, w / 2, y);
    if (isCur && flags.karaokeFill && active) {
      const width = ctx.measureText(line.text).width;
      ctx.save();
      ctx.beginPath();
      ctx.rect(w / 2 - width / 2, y - 24 * s, width * active.progress, 48 * s);
      ctx.clip();
      ctx.fillStyle = ORANGE;
      ctx.fillText(line.text, w / 2, y);
      ctx.restore();
    }
  });
}

function drawCenter(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
  active: ReturnType<typeof findActive>,
  s: number,
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  drawBg(ctx, w, h, state.portrait, state.cover);
  if (!active) {
    if (
      introOpacity(
        state.time,
        state.lines.find((l) => l.start != null)?.start ?? null,
      ) > 0.2
    ) {
      ctx.fillStyle = PAPER;
      setLyricFont(ctx, state, 600, 36, s);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(state.meta.title, w / 2, h / 2);
    }
    return;
  }
  const t = active.progress;
  const pose = lyricPose(state.motion, t, active.line.text, s);
  ctx.save();
  ctx.globalAlpha = pose.alpha;
  ctx.translate(w / 2 + pose.x, h / 2 + pose.y);
  ctx.fillStyle = PAPER;
  setLyricFont(ctx, state, 500, 40, s);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const wrapped = wrapText(ctx, pose.text, w * 0.72);
  const lh = 52 * s * fontScale(state);
  wrapped.forEach((ln, i) => {
    ctx.fillText(ln, 0, (i - (wrapped.length - 1) / 2) * lh);
  });
  ctx.restore();
}

function drawTypewriter(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
  active: ReturnType<typeof findActive>,
  s: number,
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  drawBg(ctx, w, h, state.portrait, state.cover);
  if (!active) return;
  const chars = [...active.line.text];
  const shown = chars
    .slice(0, Math.ceil(chars.length * Math.max(0.02, active.progress)))
    .join("");
  ctx.fillStyle = PAPER;
  setLyricFont(ctx, state, 500, 36, s);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const wrapped = wrapText(ctx, shown, w * 0.7);
  const lh = 48 * s * fontScale(state);
  wrapped.forEach((ln, i) => {
    ctx.fillText(ln, w / 2, h * 0.5 + (i - (wrapped.length - 1) / 2) * lh);
  });
  if (active.progress < 1) {
    const last = wrapped[wrapped.length - 1] ?? "";
    const metrics = ctx.measureText(last);
    ctx.fillStyle = ORANGE;
    ctx.fillRect(
      w / 2 + metrics.width / 2 + 6 * s,
      h * 0.5 + ((wrapped.length - 1) / 2) * lh - 16 * s,
      3 * s,
      32 * s,
    );
  }
}

function drawLowerThird(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
  active: ReturnType<typeof findActive>,
  s: number,
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  drawBg(ctx, w, h, state.portrait, state.cover);
  const barH = 128 * s;
  const g = ctx.createLinearGradient(0, h - barH * 2, 0, h);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.45, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = g;
  ctx.fillRect(0, h - barH * 2, w, barH * 2);

  if (state.flags.showCard && state.cover) {
    const cs = 88 * s;
    drawAlbumCard(ctx, state.cover, 40 * s, h - barH - 8 * s, cs);
  }
  const textX = state.flags.showCard ? 148 * s : 48 * s;
  ctx.fillStyle = "rgba(245,242,238,0.55)";
  ctx.font = `500 ${13 * s}px Syne, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(
    [state.meta.artist, state.meta.title].filter(Boolean).join("  ·  "),
    textX,
    h - 72 * s,
  );
  ctx.fillStyle = PAPER;
  setLyricFont(ctx, state, 500, 26, s);
  const text = active?.line.text ?? state.meta.subtitle ?? "";
  ctx.fillText(text, textX, h - 36 * s);
  if (active && state.flags.karaokeFill) {
    ctx.fillStyle = ORANGE;
    const width = ctx.measureText(text).width;
    ctx.fillRect(textX, h - 28 * s, width * active.progress, 3 * s);
  }
}

function drawCredits(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
  active: ReturnType<typeof findActive>,
  s: number,
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  const lh = 42 * s * fontScale(state);
  const total = state.lines.length * lh;
  const progress = state.duration > 0 ? state.time / state.duration : 0;
  const y0 = h - progress * (total + h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  state.lines.forEach((line, i) => {
    const y = y0 + i * lh;
    if (y < -40 || y > h + 40) return;
    const isCur = active?.index === i;
    setLyricFont(ctx, state, isCur ? 600 : 400, isCur ? 26 : 18, s);
    ctx.fillStyle = isCur ? ORANGE : "rgba(245,242,238,0.78)";
    ctx.fillText(line.text, w / 2, y);
  });
  if (state.flags.showMeta) {
    ctx.fillStyle = "rgba(245,242,238,0.4)";
    ctx.font = `500 ${12 * s}px Syne, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(
      [state.meta.artist, state.meta.title].filter(Boolean).join("  ·  "),
      40 * s,
      40 * s,
    );
  }
}

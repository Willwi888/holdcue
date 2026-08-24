import { CLIP_SRC, getLiveAssets, type ClipKind } from "@/lib/metro-live";

const imageCache = new Map<string, HTMLImageElement>();
const failed = new Set<string>();
const identCache = new Map<string, HTMLVideoElement>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  const hit = imageCache.get(url);
  if (hit) return Promise.resolve(hit);
  if (failed.has(url)) return Promise.reject(new Error("image failed"));
  return new Promise((resolve, reject) => {
    const img = new Image();
    const isLocal =
      url.startsWith("/") ||
      url.startsWith("blob:") ||
      url.startsWith("data:") ||
      url.startsWith(window.location.origin);
    if (!isLocal) img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      failed.add(url);
      reject(new Error("image failed"));
    };
    img.src = url;
  });
}

export async function preloadFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const faces = [
    '600 64px "Noto Sans TC"',
    '500 48px "Noto Sans TC"',
    '400 32px "Noto Sans TC"',
    '600 48px "Noto Serif TC"',
    '500 40px "Noto Serif TC"',
    '700 72px Syne',
    '400 96px "Permanent Marker"',
    '500 36px "Share Tech Mono"',
  ];
  await Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null)));
  await document.fonts.ready;
}

export function getCachedImage(url: string | null): HTMLImageElement | null {
  if (!url) return null;
  return imageCache.get(url) ?? null;
}

export function preloadIdentVideos() {
  if (typeof document === "undefined") return;
  const clips = getLiveAssets().clips;
  (Object.keys(CLIP_SRC) as ClipKind[]).forEach((kind) => {
    const url = clips[kind];
    if (identCache.has(url)) return;
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    identCache.set(url, video);
    video.load();
  });
}

export function getIdentVideo(kind: ClipKind): HTMLVideoElement | null {
  return identCache.get(getLiveAssets().clips[kind]) ?? null;
}

export function seekIdent(kind: ClipKind, time: number): HTMLVideoElement | null {
  const video = getIdentVideo(kind);
  if (!video) return null;
  const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 99;
  const t = Math.max(0, Math.min(time, dur - 0.04));
  if (Math.abs(video.currentTime - t) > 0.03) {
    try {
      video.currentTime = t;
    } catch {
      /* seeking not ready */
    }
  }
  return video.videoWidth > 0 ? video : null;
}

export function identClipDuration(kind: ClipKind, fallback: number): number {
  const video = getIdentVideo(kind);
  const dur = video?.duration;
  return Number.isFinite(dur) && (dur ?? 0) > 0.4 ? dur! : fallback;
}

export function filmIdentPads() {
  return {
    head: identClipDuration("play", 6.84),
    tail: identClipDuration("out", 8.6),
  };
}

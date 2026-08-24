import { useEffect, useRef, useState, type RefObject } from "react";
import { useProject } from "@/lib/store";
import { RESOLUTIONS } from "@/lib/types";
import { getCachedImage, loadImage, preloadFonts, preloadIdentVideos } from "@/lib/video/assets";
import { drawFrame, type DrawState } from "@/lib/video/draw-frame";
import { cn } from "@/lib/utils";

export function buildDrawState(
  time: number,
  duration: number,
  extras?: { withIdents?: boolean; identHead?: number; identTail?: number },
): DrawState {
  const s = useProject.getState();
  return {
    time,
    duration: duration || 1,
    lines: s.lines,
    meta: {
      title: s.title,
      artist: s.artist,
      album: s.album,
      subtitle: s.subtitle,
      isrc: s.isrc,
      upc: s.upc,
      releaseDate: s.releaseDate,
      label: s.label,
      links: s.links,
    },
    style: s.animStyle,
    motion: s.lyricMotion ?? "rise",
    lyricFont: s.lyricFont ?? "sans",
    lyricSize: s.lyricSize ?? "m",
    noiseSeconds: s.noiseSeconds ?? 3,
    flags: {
      showCard: s.showCard,
      showMeta: s.showMeta,
      showGraffiti: s.showGraffiti,
      karaokeFill: s.karaokeFill,
    },
    cover: s.coverUrl ? getCachedImage(s.coverUrl) : null,
    portrait: s.portraitUrl
      ? getCachedImage(s.portraitUrl)
      : s.coverUrl
        ? getCachedImage(s.coverUrl)
        : null,
    withIdents: extras?.withIdents,
    identHead: extras?.identHead,
    identTail: extras?.identTail,
  };
}

export function paint(
  canvas: HTMLCanvasElement,
  time: number,
  duration: number,
  extras?: { withIdents?: boolean; identHead?: number; identTail?: number },
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawFrame(ctx, buildDrawState(time, duration, extras));
}

export function VideoStage({
  time,
  duration,
  className,
  canvasRef,
}: {
  time: number;
  duration: number;
  className?: string;
  canvasRef?: RefObject<HTMLCanvasElement | null>;
}) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? localRef;
  const resolution = useProject((s) => s.resolution);
  const coverUrl = useProject((s) => s.coverUrl);
  const portraitUrl = useProject((s) => s.portraitUrl);
  const animStyle = useProject((s) => s.animStyle);
  const showCard = useProject((s) => s.showCard);
  const showMeta = useProject((s) => s.showMeta);
  const showGraffiti = useProject((s) => s.showGraffiti);
  const karaokeFill = useProject((s) => s.karaokeFill);
  const lyricMotion = useProject((s) => s.lyricMotion);
  const lyricFont = useProject((s) => s.lyricFont);
  const lyricSize = useProject((s) => s.lyricSize);
  const noiseSeconds = useProject((s) => s.noiseSeconds);
  const [assetTick, setAssetTick] = useState(0);
  const { w, h } = RESOLUTIONS[resolution];

  useEffect(() => {
    let cancel = false;
    void (async () => {
      await preloadFonts();
      preloadIdentVideos();
      const urls = [coverUrl, portraitUrl].filter(Boolean) as string[];
      await Promise.all(urls.map((u) => loadImage(u).catch(() => null)));
      if (!cancel) setAssetTick((n) => n + 1);
    })();
    return () => {
      cancel = true;
    };
  }, [coverUrl, portraitUrl]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    paint(canvas, time, duration);
  }, [
    ref,
    time,
    duration,
    w,
    h,
    animStyle,
    showCard,
    showMeta,
    showGraffiti,
    karaokeFill,
    lyricMotion,
    lyricFont,
    lyricSize,
    noiseSeconds,
    coverUrl,
    portraitUrl,
    assetTick,
  ]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] bg-ink shadow-[0_0_0_1px_rgb(255_255_255_/_0.08),0_30px_80px_-32px_rgb(0_0_0_/_0.8)]",
        className,
      )}
    >
      <canvas
        ref={ref}
        className="block h-auto w-full"
        style={{ aspectRatio: `${w} / ${h}` }}
      />
    </div>
  );
}

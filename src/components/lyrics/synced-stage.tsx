import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { CatalogSong } from "@/lib/catalog";
import { formatClock } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function SyncedStage({ song }: { song: CatalogSong }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const lines = useMemo(() => {
    if (song.sync.length) {
      return song.sync.map((c) => ({
        text: c.text,
        start: c.startTime,
        end: c.endTime,
      }));
    }
    const raw = song.lyrics
      .split(/\n+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const span = duration > 0 ? duration / Math.max(1, raw.length) : 4;
    return raw.map((text, i) => ({
      text,
      start: i * span,
      end: (i + 1) * span,
    }));
  }, [song, duration]);

  const active = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]!;
      if (time >= l.start) idx = i;
    }
    return idx;
  }, [lines, time]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setTime(el.currentTime);
    const onDur = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("durationchange", onDur);
    el.addEventListener("loadedmetadata", onDur);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onPause);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("durationchange", onDur);
      el.removeEventListener("loadedmetadata", onDur);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onPause);
    };
  }, [song.id]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  const cover = song.coverUrl;
  const windowStart = Math.max(0, active - 3);
  const vis = lines.slice(windowStart, windowStart + 9);

  return (
    <div className="relative min-h-dvh overflow-hidden text-fg">
      {cover ? (
        <img
          src={cover}
          alt=""
          className="pointer-events-none absolute inset-0 size-full object-cover opacity-45"
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(5_7_12_/_0.55)_0%,rgb(5_7_12_/_0.78)_45%,rgb(5_7_12_/_0.94)_100%)]" />

      <audio
        ref={audioRef}
        src={song.audioUrl ?? undefined}
        preload="auto"
        playsInline
        crossOrigin="anonymous"
        className="hidden"
      />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <div className="flex items-center gap-3">
          {cover ? (
            <img
              src={cover}
              alt=""
              className="size-14 rounded-[10px] object-cover outline outline-1 -outline-offset-1 outline-white/15"
            />
          ) : (
            <div className="size-14 rounded-[10px] bg-surface-2" />
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold">{song.title}</p>
            <p className="truncate text-xs text-muted">Willwi · {song.albumName}</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          <div className="space-y-3 text-center">
            {vis.map((line, i) => {
              const abs = windowStart + i;
              const isCur = abs === active;
              return (
                <p
                  key={`${abs}-${line.start}`}
                  className={cn(
                    "transition-[opacity,transform,font-size,color] duration-300",
                    isCur
                      ? "text-[22px] font-medium leading-snug text-fg sm:text-[26px]"
                      : "text-[15px] leading-7 text-fg/30 sm:text-base",
                  )}
                >
                  {line.text}
                </p>
              );
            })}
            {lines.length === 0 && (
              <p className="text-sm text-muted">這首歌還沒有對好的詞。</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-fg"
              aria-label={playing ? "暫停" : "播放"}
            >
              {playing ? (
                <Pause className="size-5 fill-current" />
              ) : (
                <Play className="size-5 fill-current ml-0.5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.05}
              value={Math.min(time, duration || 0)}
              onChange={(e) => {
                const el = audioRef.current;
                if (!el) return;
                el.currentTime = Number(e.target.value);
                setTime(el.currentTime);
              }}
              className="h-1 min-w-0 flex-1 appearance-none rounded-full bg-white/15 accent-accent"
              aria-label="進度"
            />
            <span className="w-16 shrink-0 text-right text-[11px] tabular text-muted">
              {formatClock(time)}
            </span>
          </div>
          <p className="text-center text-[11px] leading-relaxed text-subtle">
            這是創作互動的動態歌詞，不是完整串流播放。請到 Spotify 或 Apple Music 聽原錄音。
          </p>
          <div className="flex justify-center gap-4 text-xs">
            {song.spotifyLink ? (
              <a
                href={song.spotifyLink}
                target="_blank"
                rel="noreferrer"
                className="text-muted underline-offset-4 hover:text-fg hover:underline"
              >
                Spotify
              </a>
            ) : null}
            {song.appleMusicLink ? (
              <a
                href={song.appleMusicLink}
                target="_blank"
                rel="noreferrer"
                className="text-muted underline-offset-4 hover:text-fg hover:underline"
              >
                Apple Music
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

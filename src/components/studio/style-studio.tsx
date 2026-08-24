import { Check } from "lucide-react";
import { useEffect } from "react";
import { usePlayer } from "@/components/audio-host";
import { Button } from "@/components/ui/button";
import { VideoStage } from "@/components/studio/video-stage";
import { useProject } from "@/lib/store";
import {
  ANIM_OPTIONS,
  FONT_OPTIONS,
  MOTION_OPTIONS,
  SIZE_OPTIONS,
  type AnimStyle,
  type LyricFont,
  type LyricMotion,
  type LyricSize,
  type Resolution,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function StyleStudio() {
  const s = useProject();
  const { playing, time, duration, toggle, seek } = usePlayer();

  useEffect(() => {
    const first = useProject.getState().lines.find((l) => l.start != null);
    if (first?.start != null) seek(first.start + 0.2);
    // Show a lyric immediately instead of the silent intro.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:py-10">
      <header className="rise-in mb-5 max-w-2xl sm:mb-8">
        <p className="mb-2 text-xs font-medium tracking-[0.18em] text-accent">
          STEP 03
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-4xl">
          歌詞動畫
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted sm:mt-3">
          選一種畫面，按播放看歌詞怎麼走。成片只給聽眾看歌詞與專輯，不帶後台欄位。
        </p>
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)] lg:gap-8">
        <div className="rise-in rise-in-1 min-w-0">
          <VideoStage time={time} duration={duration} />
          <div className="mt-3 flex min-w-0 items-center gap-2 sm:mt-4 sm:gap-3">
            <Button type="button" variant="secondary" onClick={toggle}>
              {playing ? "暫停" : "播放"}
            </Button>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.05}
              value={Math.min(time, duration || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-surface-2 accent-accent"
              aria-label="預覽進度"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => seek(0)}
            >
              開頭
            </Button>
          </div>
        </div>

        <div className="rise-in rise-in-2 space-y-6">
          <section>
            <h2 className="mb-3 font-display text-sm font-semibold tracking-wide">
              動畫
            </h2>
            <div className="grid gap-2">
              {ANIM_OPTIONS.map((opt) => {
                const on = s.animStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => s.patch({ animStyle: opt.id as AnimStyle })}
                    className={cn(
                      "rounded-[16px] px-4 py-3 text-left transition-[background-color,box-shadow] duration-150",
                      on
                        ? "bg-surface-2 shadow-[0_0_0_1px_var(--color-accent)]"
                        : "bg-surface shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)] hover:bg-surface-2",
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{opt.label}</span>
                      {on && <Check className="size-4 text-accent" />}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted">
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm font-semibold tracking-wide">
              歌詞動態
            </h2>
            <div className="grid gap-2">
              {MOTION_OPTIONS.map((opt) => {
                const on = s.lyricMotion === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => s.patch({ lyricMotion: opt.id as LyricMotion })}
                    className={cn(
                      "rounded-[16px] px-4 py-3 text-left transition-[background-color,box-shadow] duration-150",
                      on
                        ? "bg-surface-2 shadow-[0_0_0_1px_var(--color-accent)]"
                        : "bg-surface shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)] hover:bg-surface-2",
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{opt.label}</span>
                      {on && <Check className="size-4 text-accent" />}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted">
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm font-semibold tracking-wide">
              字體
            </h2>
            <p className="mb-3 text-xs leading-relaxed text-muted">
              只改歌詞長相。歌名、ISRC、公司還是會寫在成片上，後台網址不會進去。
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FONT_OPTIONS.map((opt) => {
                const on = (s.lyricFont ?? "sans") === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => s.patch({ lyricFont: opt.id as LyricFont })}
                    className={cn(
                      "rounded-[16px] px-3 py-3 text-left transition-[background-color,box-shadow] duration-150",
                      on
                        ? "bg-surface-2 shadow-[0_0_0_1px_var(--color-accent)]"
                        : "bg-surface shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)] hover:bg-surface-2",
                    )}
                  >
                    <span
                      className="block text-[15px] leading-none"
                      style={{
                        fontFamily:
                          opt.id === "serif"
                            ? '"Noto Serif TC", serif'
                            : opt.id === "display"
                              ? "Syne, sans-serif"
                              : opt.id === "marker"
                                ? '"Permanent Marker", cursive'
                                : opt.id === "mono"
                                  ? '"Share Tech Mono", monospace'
                                  : '"Noto Sans TC", sans-serif',
                      }}
                    >
                      {opt.label}
                    </span>
                    <span className="mt-1.5 block text-[11px] leading-relaxed text-muted">
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm font-semibold tracking-wide">
              大小
            </h2>
            <div className="flex gap-2">
              {SIZE_OPTIONS.map((opt) => {
                const on = (s.lyricSize ?? "m") === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => s.patch({ lyricSize: opt.id as LyricSize })}
                    className={cn(
                      "h-11 flex-1 rounded-[12px] text-sm transition-[background-color,box-shadow] duration-150",
                      on
                        ? "bg-accent text-accent-fg"
                        : "bg-surface-2 text-fg shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)]",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm font-semibold tracking-wide">
              循環噪點
            </h2>
            <div className="flex gap-2">
              {([2, 3, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => s.patch({ noiseSeconds: n })}
                  className={cn(
                    "h-11 flex-1 rounded-[12px] text-sm transition-[background-color,box-shadow] duration-150",
                    s.noiseSeconds === n
                      ? "bg-accent text-accent-fg"
                      : "bg-surface-2 text-fg shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)]",
                  )}
                >
                  {n} 秒
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-subtle">
              開頭與結尾會加重循環顆粒，整支影片都帶一層底噪。
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm font-semibold tracking-wide">
              畫面元素
            </h2>
            <div className="space-y-2">
              <Toggle
                label="專輯封面卡"
                on={s.showCard}
                onChange={(v) => s.patch({ showCard: v })}
              />
              <Toggle
                label="橘色彩繪專輯名"
                on={s.showGraffiti}
                onChange={(v) => s.patch({ showGraffiti: v })}
              />
              <Toggle
                label="卡拉 OK 填色"
                on={s.karaokeFill}
                onChange={(v) => s.patch({ karaokeFill: v })}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm font-semibold tracking-wide">
              解析度
            </h2>
            <div className="flex gap-2">
              {(["720p", "1080p"] as Resolution[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => s.patch({ resolution: r })}
                  className={cn(
                    "h-11 flex-1 rounded-[12px] text-sm transition-[background-color,box-shadow] duration-150",
                    s.resolution === r
                      ? "bg-accent text-accent-fg"
                      : "bg-surface-2 text-fg shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)]",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => s.setStep("cue")}
            >
              返回對時
            </Button>
            <Button type="button" onClick={() => s.setStep("export")}>
              前往輸出
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex h-11 w-full items-center justify-between rounded-[12px] bg-surface px-3.5 text-sm shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)]"
    >
      {label}
      <span
        className={cn(
          "relative h-6 w-10 rounded-full transition-[background-color] duration-150",
          on ? "bg-accent" : "bg-surface-2",
        )}
      >
        <span
          className="absolute top-0.5 size-5 rounded-full bg-fg transition-[left] duration-150"
          style={{ left: on ? "18px" : "2px" }}
        />
      </span>
    </button>
  );
}

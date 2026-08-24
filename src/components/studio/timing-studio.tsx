import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { usePlayer } from "@/components/audio-host";
import { BrandMark, StepNav } from "@/components/step-nav";
import { Button } from "@/components/ui/button";
import { CUE_COMPANION, AFTERWORD } from "@/lib/copy";
import { timedCount, useProject } from "@/lib/store";
import { computePeaks } from "@/lib/waveform";
import { cn, formatClock } from "@/lib/utils";

export function TimingStudio() {
  const lines = useProject((s) => s.lines);
  const cueIndex = useProject((s) => s.cueIndex);
  const setCueIndex = useProject((s) => s.setCueIndex);
  const setLineTiming = useProject((s) => s.setLineTiming);
  const undoLastCue = useProject((s) => s.undoLastCue);
  const resetTiming = useProject((s) => s.resetTiming);
  const setStep = useProject((s) => s.setStep);
  const audioUrl = useProject((s) => s.audioUrl);
  const { playing, time, duration, play, pause, toggle, seek, audioRef } =
    usePlayer();

  const holdingRef = useRef(false);
  const cueRef = useRef(cueIndex);
  const linesRef = useRef(lines);
  const listRef = useRef<HTMLDivElement>(null);
  const [holding, setHolding] = useState(false);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const started = playing || time > 0.05;

  useEffect(() => {
    cueRef.current = cueIndex;
    linesRef.current = lines;
  }, [cueIndex, lines]);

  useEffect(() => {
    if (!audioUrl) return;
    let cancel = false;
    void computePeaks(audioUrl, 128)
      .then((p) => {
        if (!cancel) setPeaks(p);
      })
      .catch(() => {
        if (!cancel) setPeaks(null);
      });
    return () => {
      cancel = true;
    };
  }, [audioUrl]);

  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-line="${cueIndex}"]`);
    node?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [cueIndex]);

  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };

    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (e.repeat) return;
        if (!playing) return;
        const line = linesRef.current[cueRef.current];
        if (!line) return;
        if (holdingRef.current) return;
        holdingRef.current = true;
        setHolding(true);
        const t = audioRef.current?.currentTime ?? 0;
        setLineTiming(line.id, t, null);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        seek(time - 2);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        seek(time + 2);
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        if (holdingRef.current) {
          const line = linesRef.current[cueRef.current];
          if (line) setLineTiming(line.id, null, null);
          holdingRef.current = false;
          setHolding(false);
        } else {
          undoLastCue();
        }
      }
    };

    const onUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (!holdingRef.current) return;
      holdingRef.current = false;
      setHolding(false);
      const line = linesRef.current[cueRef.current];
      if (!line) return;
      const t = audioRef.current?.currentTime ?? 0;
      const start = line.start ?? t;
      const end = Math.max(start + 0.12, t);
      setLineTiming(line.id, start, end);
      setCueIndex(cueRef.current + 1);
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [playing, toggle, seek, time, setLineTiming, setCueIndex, undoLastCue, audioRef]);

  const timed = timedCount(lines);
  const allDone = lines.length > 0 && timed === lines.length;
  const current = lines[cueIndex] ?? null;

  const onHoldStart = () => {
    const line = lines[cueIndex];
    if (!line || holdingRef.current) return;
    holdingRef.current = true;
    setHolding(true);
    setLineTiming(line.id, audioRef.current?.currentTime ?? 0, null);
  };
  const onHoldEnd = () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    const line = lines[cueIndex];
    if (!line) return;
    const t = audioRef.current?.currentTime ?? 0;
    const start = line.start ?? t;
    setLineTiming(line.id, start, Math.max(start + 0.12, t));
    setCueIndex(cueIndex + 1);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex min-w-0 items-center justify-between gap-2 border-b border-border bg-bg/70 px-3 py-3 backdrop-blur-md sm:gap-3 sm:px-6 sm:py-4">
        <BrandMark />
        <StepNav />
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-36 pt-2 sm:pb-28">
        <div className="rise-in text-center">
          {allDone ? (
            <>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-hold sm:text-xs">
                {AFTERWORD.kicker}
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted sm:hidden">
                這是屬於你的版本。按「前往畫面」看它怎麼走。
              </p>
              <div className="mx-auto mt-4 hidden max-w-md space-y-2 text-sm leading-relaxed text-fg sm:block">
                {AFTERWORD.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-hold sm:text-xs">
                {CUE_COMPANION.kicker}
              </p>
              <div className="mx-auto mt-4 max-w-md space-y-2 text-sm leading-relaxed text-fg">
                {CUE_COMPANION.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <p className="mt-6 hidden text-[11px] font-semibold tracking-[0.14em] text-hold sm:block sm:text-xs">
                HOLD YOUR SPACEBAR DOWN
              </p>
              <p className="mt-1 hidden text-sm text-muted sm:block">聽到該句開始時，按住空白鍵</p>
              <p className="mt-3 hidden text-[11px] font-semibold tracking-[0.14em] text-release sm:block sm:text-xs">
                RELEASE YOUR SPACEBAR
              </p>
              <p className="mt-1 hidden text-sm text-muted sm:block">這句唱完就放開，跳下一句</p>
              <p className="mt-4 text-sm leading-relaxed text-muted sm:hidden">
                按住下方橘色鈕對這一句，放開就跳下一句。
              </p>
            </>
          )}
          <p className="mt-4 hidden text-sm text-muted sm:block">
            <span className="font-semibold tracking-[0.12em] text-delete">
              DELETE
            </span>{" "}
            按錯就刪回上句，或{" "}
            <button
              type="button"
              className="underline decoration-fg/30 underline-offset-4 transition-[color] duration-150 hover:text-fg"
              onClick={() => {
                holdingRef.current = false;
                setHolding(false);
                resetTiming();
                seek(0);
                pause();
              }}
            >
              點此重設
            </button>
          </p>
        </div>

        <div className="rise-in rise-in-1 mt-8 flex flex-col items-center gap-3">
          {!started && (
            <span className="rounded-full bg-hold px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-accent-fg">
              CLICK PLAY TO BEGIN
            </span>
          )}
          <div className="flex w-full items-center gap-3 rounded-[20px] bg-surface/80 px-3 py-3 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] backdrop-blur-md">
            <button
              type="button"
              onClick={() => (playing ? pause() : play())}
              className="grid size-14 shrink-0 place-items-center rounded-full bg-hold text-accent-fg transition-[scale,background-color] duration-150 ease-out hover:bg-accent-hover active:scale-[0.96]"
              aria-label={playing ? "暫停" : "播放"}
            >
              {playing ? (
                <Pause className="size-6 fill-current" />
              ) : (
                <Play className="size-6 fill-current ml-0.5" />
              )}
            </button>
            <Waveform
              peaks={peaks}
              time={time}
              duration={duration}
              onSeek={seek}
            />
            <span className="hidden w-16 shrink-0 text-right text-xs tabular text-muted sm:block">
              {formatClock(time)}
            </span>
          </div>
          <p className="text-xs tabular text-muted">
            {timed} / {lines.length} 句已對時
            {current ? ` · 下一句：${current.text}` : allDone ? " · 全部完成" : ""}
          </p>
        </div>

        <div
          ref={listRef}
          className="rise-in rise-in-2 mt-8 flex-1 space-y-1 pb-4 text-center"
        >
          {lines.map((line, i) => {
            const isCurrent = i === cueIndex;
            const isHeld = isCurrent && holding;
            const done = line.start != null && line.end != null;
            return (
              <button
                key={line.id}
                type="button"
                data-line={i}
                onClick={() => {
                  setCueIndex(i);
                  if (line.start != null) seek(line.start);
                }}
                className={cn(
                  "block w-full rounded-[12px] px-3 py-1.5 text-[15px] leading-8 transition-[color,background-color,opacity] duration-150 sm:text-base",
                  isHeld && "bg-hold/10 font-medium text-hold",
                  !isHeld && isCurrent && "font-medium text-fg",
                  !isHeld && !isCurrent && done && "text-fg/70",
                  !isHeld && !isCurrent && !done && "text-fg/35",
                )}
              >
                {line.text}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/90 px-4 pt-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="paper"
              size="sm"
              onClick={() => setStep("setup")}
            >
              返回
            </Button>
            <Button
              type="button"
              variant="paper"
              size="sm"
              onClick={undoLastCue}
            >
              上一句
            </Button>
            <Button
              type="button"
              variant="ink"
              size="sm"
              disabled={timed === 0}
              onClick={() => setStep("style")}
              className="ml-auto"
            >
              {allDone ? "前往畫面" : "先用這些句子"}
            </Button>
          </div>
          <button
            type="button"
            className="flex h-14 w-full touch-none select-none items-center justify-center rounded-[16px] bg-hold text-sm font-semibold tracking-wide text-accent-fg transition-[scale,background-color] duration-150 active:scale-[0.96] sm:hidden"
            onPointerDown={(e) => {
              e.preventDefault();
              if (!playing) void play();
              onHoldStart();
            }}
            onPointerUp={onHoldEnd}
            onPointerCancel={onHoldEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            {holding ? "放開，下一句" : playing ? "按住對時" : "按住開始"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Waveform({
  peaks,
  time,
  duration,
  onSeek,
}: {
  peaks: number[] | null;
  time: number;
  duration: number;
  onSeek: (t: number) => void;
}) {
  const ratio = duration > 0 ? time / duration : 0;
  return (
    <button
      type="button"
      className="relative h-10 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2"
      aria-label="進度"
      onClick={(e) => {
        if (!duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        onSeek(x * duration);
      }}
    >
      <div className="absolute inset-0 flex items-center gap-px px-2">
        {(peaks ?? Array.from({ length: 64 }, () => 0.25)).map((p, i) => (
          <span
            key={i}
            className="flex-1 rounded-full bg-fg/25"
            style={{ height: `${Math.max(12, p * 100)}%` }}
          />
        ))}
      </div>
      <div
        className="absolute inset-y-1 left-0 rounded-full bg-hold/25"
        style={{ width: `${Math.min(100, ratio * 100)}%` }}
      />
      <div
        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hold shadow-[0_0_0_3px_rgb(232_90_18_/_0.25)]"
        style={{ left: `${Math.min(100, ratio * 100)}%` }}
      />
    </button>
  );
}

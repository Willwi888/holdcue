import { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/components/audio-host";
import { computePeaks } from "@/lib/waveform";
import { timedCount, useProject } from "@/lib/store";
import { cn, formatClock } from "@/lib/utils";

export function ClassicCue() {
  const lines = useProject((s) => s.lines);
  const cueIndex = useProject((s) => s.cueIndex);
  const setCueIndex = useProject((s) => s.setCueIndex);
  const setLineTiming = useProject((s) => s.setLineTiming);
  const undoLastCue = useProject((s) => s.undoLastCue);
  const resetTiming = useProject((s) => s.resetTiming);
  const setStep = useProject((s) => s.setStep);
  const audioUrl = useProject((s) => s.audioUrl);
  const title = useProject((s) => s.title);
  const { playing, time, duration, play, pause, seek, audioRef } = usePlayer();

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
    void computePeaks(audioUrl, 96)
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
    const typing = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
    };
    const onDown = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (e.repeat || holdingRef.current) return;
        if (!playing) return;
        const line = linesRef.current[cueRef.current];
        if (!line) return;
        holdingRef.current = true;
        setHolding(true);
        setLineTiming(line.id, audioRef.current?.currentTime ?? 0, null);
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
      setLineTiming(line.id, start, Math.max(start + 0.12, t));
      setCueIndex(cueRef.current + 1);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [playing, play, setLineTiming, setCueIndex, undoLastCue, audioRef]);

  const timed = timedCount(lines);
  const allDone = lines.length > 0 && timed === lines.length;
  const current = lines[cueIndex] ?? null;

  const reset = () => {
    holdingRef.current = false;
    setHolding(false);
    resetTiming();
    seek(0);
    pause();
  };

  const onHoldStart = () => {
    if (!playing) return;
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
    <div className="classic-skin min-h-dvh bg-white text-[#4a4a4a]">
      <div className="mx-auto max-w-2xl px-5 pb-28 pt-10 sm:pt-16">
        <p className="text-center text-[15px] leading-8 text-[#444]">
          <span className="font-bold tracking-wide text-[#e85a12]">先按播放鍵</span>
          <br />
          音樂開始之後，空白鍵才有用
        </p>
        <p className="mt-5 text-center text-[15px] leading-8 text-[#444]">
          <span className="font-bold tracking-wide text-[#e85a12]">按住空白鍵</span>
          <br />
          這一句開始
        </p>
        <p className="mt-5 text-center text-[15px] leading-8 text-[#444]">
          <span className="font-bold tracking-wide text-[#e85a12]">放開</span>
          <br />
          跳下一句
        </p>
        <p className="mt-5 text-center text-[15px] leading-8 text-[#444]">
          <span className="font-bold tracking-wide text-[#e85a12]">倒退鍵</span> 刪最後一句
          <br />
          <button type="button" className="font-semibold text-[#1d6fd8] underline" onClick={reset}>
            全部重來
          </button>
        </p>

        <div className="relative mx-auto mt-12 max-w-xl">
          {!started && (
            <button
              type="button"
              onClick={() => void play()}
              className="absolute -top-7 left-0 rounded-t-[6px] bg-[#e85a12] px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-white"
            >
              先按播放鍵
            </button>
          )}
          <div className="flex overflow-hidden rounded-sm bg-[#efefef]">
            <button
              type="button"
              onClick={() => (playing ? pause() : void play())}
              className="grid size-[88px] shrink-0 place-items-center bg-[#f2f2f2]"
              aria-label={playing ? "暫停" : "播放"}
            >
              {audioUrl ? (
                <span className="grid size-14 place-items-center rounded-full bg-[#e85a12] text-white">
                  {playing ? (
                    <span className="block h-4 w-3.5 border-x-[5px] border-white" />
                  ) : (
                    <span className="ml-0.5 block border-y-[10px] border-l-[16px] border-y-transparent border-l-white" />
                  )}
                </span>
              ) : (
                <span className="grid size-14 animate-spin place-items-center text-[#e85a12] text-3xl">
                  ⚙
                </span>
              )}
            </button>
            <button
              type="button"
              className="relative min-h-[88px] min-w-0 flex-1"
              onClick={(e) => {
                if (!duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                seek(((e.clientX - rect.left) / rect.width) * duration);
              }}
            >
              <div className="absolute inset-x-3 inset-y-5 flex items-center gap-px">
                {(peaks ?? Array.from({ length: 64 }, () => 0.22)).map((p, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-full bg-[#2f6f7a]"
                    style={{ height: `${Math.max(10, p * 100)}%` }}
                  />
                ))}
              </div>
              <div
                className="absolute inset-y-0 left-0 bg-[#e85a12]/15"
                style={{ width: `${duration ? Math.min(100, (time / duration) * 100) : 0}%` }}
              />
            </button>
          </div>
          <p className="mt-2 text-right text-xs tabular-nums text-[#999]">
            {formatClock(time)}
            {duration ? ` / ${formatClock(duration)}` : ""}
          </p>
        </div>

        <p className="mt-2 text-center text-sm text-[#888]">
          {title}
          {current ? ` · ${current.text}` : allDone ? " · 全部放下了" : ""}
        </p>

        <div ref={listRef} className="mt-10 space-y-6 text-center">
          {lines.map((line, i) => {
            const isCurrent = i === cueIndex;
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
                  "block w-full text-[18px] leading-9 sm:text-[22px] sm:leading-10",
                  holding && isCurrent && "text-[#e85a12]",
                  !holding && isCurrent && "text-[#222]",
                  !isCurrent && done && "text-[#555]",
                  !isCurrent && !done && "text-[#b0b0b0]",
                )}
              >
                {line.text}
              </button>
            );
          })}
        </div>

        {allDone && (
          <div className="mt-12 text-center">
            <p className="text-sm leading-7 text-[#666]">
              這不是一個完美的版本。
              <br />
              這是一個屬於你的版本。
            </p>
            <button
              type="button"
              className="mt-6 bg-[#e85a12] px-5 py-2.5 text-sm font-semibold text-white"
              onClick={() => setStep("export")}
            >
              匯出歌詞影片
            </button>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-[#eee] bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-2xl items-center gap-3 text-sm">
          <button type="button" className="text-[#888]" onClick={reset}>
            重新對
          </button>
          <button type="button" className="text-[#888]" onClick={undoLastCue}>
            上一句
          </button>
          <span className="ml-auto tabular-nums text-[#aaa]">
            {timed}/{lines.length}
          </span>
          {allDone && (
            <button
              type="button"
              className="bg-[#e85a12] px-3 py-1.5 text-white"
              onClick={() => setStep("export")}
            >
              匯出歌詞影片
            </button>
          )}
        </div>
        <button
          type="button"
          className="mt-2 flex h-12 w-full touch-none select-none items-center justify-center rounded-sm bg-[#e85a12] text-sm font-semibold text-white sm:hidden"
          onPointerDown={(e) => {
            e.preventDefault();
            onHoldStart();
          }}
          onPointerUp={onHoldEnd}
          onPointerCancel={onHoldEnd}
        >
          {holding ? "放開，下一句" : "按住對時"}
        </button>
      </div>
    </div>
  );
}

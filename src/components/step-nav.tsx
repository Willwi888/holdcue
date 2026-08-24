import { cn } from "@/lib/utils";
import { timedCount, useProject } from "@/lib/store";
import type { Step } from "@/lib/types";

const STEPS: { id: Step; n: string; label: string }[] = [
  { id: "setup", n: "01", label: "專案" },
  { id: "cue", n: "02", label: "對時" },
  { id: "style", n: "03", label: "畫面" },
  { id: "export", n: "04", label: "輸出" },
];

export function StepNav({ paper = false }: { paper?: boolean }) {
  const step = useProject((s) => s.step);
  const setStep = useProject((s) => s.setStep);
  const lines = useProject((s) => s.lines);
  const lyricsText = useProject((s) => s.lyricsText);
  const audioUrl = useProject((s) => s.audioUrl);
  const current = STEPS.findIndex((s) => s.id === step);
  const timed = timedCount(lines);

  const canEnter = (id: Step) => {
    if (id === "setup") return true;
    if (id === "cue") return Boolean(lyricsText.trim()) && Boolean(audioUrl);
    if (id === "style" || id === "export") return timed > 0;
    return false;
  };

  return (
    <nav className="flex items-center gap-1 sm:gap-2" aria-label="步驟">
      {STEPS.map((s, i) => {
        const active = s.id === step;
        const enabled = canEnter(s.id);
        return (
          <button
            key={s.id}
            type="button"
            disabled={!enabled}
            onClick={() => enabled && setStep(s.id)}
            className={cn(
              "flex size-9 items-center justify-center rounded-full text-xs tracking-wide transition-[background-color,color,opacity] duration-150 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-1.5",
              active
                ? "bg-surface-2 text-fg shadow-[0_0_0_1px_rgb(255_255_255_/_0.1)]"
                : "text-muted hover:text-fg disabled:opacity-30",
            )}
          >
            <span
              className={cn(
                "font-display text-[11px] font-semibold tabular",
                active ? (paper ? "text-accent" : "text-accent") : "",
              )}
            >
              {s.n}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
            {i < STEPS.length - 1 ? null : null}
          </button>
        );
      })}
      <span className="sr-only">目前第 {current + 1} 步</span>
    </nav>
  );
}

export function BrandMark({ paper = false }: { paper?: boolean }) {
  const setStep = useProject((s) => s.setStep);
  return (
    <button
      type="button"
      onClick={() => {
        setStep("home");
        if (window.location.pathname !== "/") window.location.assign("/");
      }}
      className="flex min-w-0 items-center gap-2"
    >
      <img
        src="/icon-192.png"
        alt=""
        className="size-8 shrink-0 rounded-full object-cover outline outline-1 -outline-offset-1 outline-white/15"
      />
      <span className="flex flex-col items-start leading-none">
        <span className="font-display text-[11px] font-extrabold tracking-[0.12em] text-fg sm:text-sm sm:tracking-[0.16em]">
          情緒捷運線
        </span>
        <span className="mt-1 hidden text-[10px] tracking-[0.16em] text-muted sm:block">
          深夜對時
        </span>
      </span>
    </button>
  );
}

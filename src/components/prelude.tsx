import { Button } from "@/components/ui/button";
import { PRELUDE } from "@/lib/copy";
import { readPass } from "@/lib/pass-session";
import { useProject } from "@/lib/store";

export function Prelude() {
  const setStep = useProject((s) => s.setStep);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-64px)] w-full max-w-xl flex-col justify-center px-6 py-16">
      <p className="rise-in text-xs font-medium tracking-[0.22em] text-accent">
        {PRELUDE.kicker}
      </p>
      <h1 className="rise-in rise-in-1 mt-6 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {PRELUDE.lead}
      </h1>
      <div className="rise-in rise-in-2 mt-8 space-y-3 text-base leading-relaxed text-muted">
        {PRELUDE.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="rise-in rise-in-3 mt-10 space-y-2 text-base leading-relaxed text-fg">
        {PRELUDE.turn.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <p className="rise-in rise-in-3 mt-6 text-sm text-subtle">
        {readPass()?.name
          ? `${readPass()?.name}，你的資料已經留下。接下來沒有再來一次。`
          : "進來之前，基本資料要先留下。"}
      </p>
      <div className="rise-in rise-in-4 mt-12">
        <Button type="button" size="lg" onClick={() => setStep("setup")}>
          {PRELUDE.cta}
        </Button>
      </div>
    </div>
  );
}
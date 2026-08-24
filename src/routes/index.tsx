import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AudioHost } from "@/components/audio-host";
import { MetroGate } from "@/components/metro/gate";
import { MetroIntro } from "@/components/metro/intro";
import { MetroLine } from "@/components/metro/line";
import { BrandMark, StepNav } from "@/components/step-nav";
import { Prelude } from "@/components/prelude";
import { ExportStudio } from "@/components/studio/export-studio";
import { SetupForm } from "@/components/studio/setup-form";
import { StyleStudio } from "@/components/studio/style-studio";
import { TimingStudio } from "@/components/studio/timing-studio";
import {
  DEMO_AUDIO,
  DEMO_COVER,
  DEMO_PORTRAIT,
} from "@/lib/demo-data";
import { loadFile } from "@/lib/files";
import { INTRO_SEEN_KEY } from "@/lib/metro";
import { readPass } from "@/lib/pass-session";
import { useProject } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [ready, setReady] = useState(false);
  const step = useProject((s) => s.step);
  const hydrated = useProject((s) => s.hydrated);

  useEffect(() => {
    void (async () => {
      await useProject.persist.rehydrate();
      const s = useProject.getState();
      if (s.usingDemoAudio) {
        s.setAudio(DEMO_AUDIO, s.audioName || "demo-empty-seat.mp3", true);
      } else if (s.audioUrl && /^https?:\/\//.test(s.audioUrl)) {
        /* catalog remote audio already restored */
      } else {
        const blob = await loadFile("audio");
        if (blob) s.setAudio(URL.createObjectURL(blob), s.audioName || blob.type, false);
      }
      if (s.usingDemoCover) s.setCover(DEMO_COVER, true);
      else if (s.coverUrl && /^https?:\/\//.test(s.coverUrl)) {
        /* catalog cover */
      } else {
        const blob = await loadFile("cover");
        if (blob) s.setCover(URL.createObjectURL(blob), false);
      }
      if (s.usingDemoPortrait) s.setPortrait(DEMO_PORTRAIT, true);
      else if (s.portraitUrl && /^https?:\/\//.test(s.portraitUrl)) {
        /* catalog portrait */
      } else {
        const blob = await loadFile("portrait");
        if (blob) s.setPortrait(URL.createObjectURL(blob), false);
      }
      if (s.lyricsText && s.lines.length === 0) s.setLyricsText(s.lyricsText);
      const pass = readPass();
      if (
        !pass?.canTime &&
        (s.step === "setup" ||
          s.step === "cue" ||
          s.step === "style" ||
          s.step === "export" ||
          s.step === "prelude")
      ) {
        s.setStep("home");
      }
      if (pass?.canTime && sessionStorage.getItem("holdcue-open-studio") === "1") {
        sessionStorage.removeItem("holdcue-open-studio");
        s.setStep("prelude");
      }
      s.markHydrated();
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const openStudio = () => {
      if (readPass()?.canTime) useProject.getState().setStep("prelude");
    };
    window.addEventListener("metro-studio", openStudio);
    return () => window.removeEventListener("metro-studio", openStudio);
  }, []);

  if (!ready || !hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center bg-black text-amber-200/70">
        <p className="font-display text-sm tracking-[0.28em]">情緒捷運線</p>
      </div>
    );
  }

  const studio = step !== "home";

  return (
    <AudioHost>
      {step === "cue" ? (
        <TimingStudio />
      ) : studio ? (
        <div className="min-h-dvh text-fg">
          <header className="sticky top-0 z-20 flex min-w-0 items-center justify-between gap-2 border-b border-border bg-bg/70 px-3 py-3 backdrop-blur-md sm:gap-3 sm:px-6">
            <BrandMark />
            {step === "prelude" ? (
              <span className="text-xs tracking-[0.16em] text-subtle">開始之前</span>
            ) : (
              <StepNav />
            )}
          </header>
          {step === "prelude" && <Prelude />}
          {step === "setup" && <SetupForm />}
          {step === "style" && <StyleStudio />}
          {step === "export" && <ExportStudio />}
        </div>
      ) : (
        <MetroHome />
      )}
    </AudioHost>
  );
}

function MetroHome() {
  const [pass, setPass] = useState(() => readPass());
  const [intro, setIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
  });

  useEffect(() => {
    const sync = () => {
      setPass(readPass());
      setIntro(sessionStorage.getItem(INTRO_SEEN_KEY) === "1");
    };
    window.addEventListener("metro-pass", sync);
    return () => window.removeEventListener("metro-pass", sync);
  }, []);

  if (!pass) return <MetroGate />;
  if (!intro) return <MetroIntro onEnter={() => setIntro(true)} />;
  return <MetroLine />;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useProject } from "@/lib/store";

const AudioRefContext = createContext<RefObject<HTMLAudioElement | null> | null>(
  null,
);

export function AudioHost({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLAudioElement>(null);
  const audioUrl = useProject((s) => s.audioUrl);
  return (
    <AudioRefContext.Provider value={ref}>
      <audio
        ref={ref}
        src={audioUrl ?? undefined}
        preload="auto"
        className="hidden"
        crossOrigin="anonymous"
        playsInline
      />
      {children}
    </AudioRefContext.Provider>
  );
}

export function useAudioEl() {
  const ctx = useContext(AudioRefContext);
  if (!ctx) throw new Error("useAudioEl must be used within AudioHost");
  return ctx;
}

export function usePlayer() {
  const audioRef = useAudioEl();
  const audioUrl = useProject((s) => s.audioUrl);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

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
    onDur();
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("durationchange", onDur);
      el.removeEventListener("loadedmetadata", onDur);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onPause);
    };
  }, [audioRef, audioUrl]);

  useEffect(() => {
    if (!playing) return;
    let id = 0;
    const loop = () => {
      const el = audioRef.current;
      if (el) setTime(el.currentTime);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [playing, audioRef]);

  const play = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      await el.play();
    } catch {
      /* autoplay */
    }
  }, [audioRef]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, [audioRef]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void play();
    else pause();
  }, [audioRef, play, pause]);

  const seek = useCallback(
    (t: number) => {
      const el = audioRef.current;
      if (!el) return;
      el.currentTime = Math.max(0, t);
      setTime(el.currentTime);
    },
    [audioRef],
  );

  return { playing, time, duration, play, pause, toggle, seek, audioRef };
}

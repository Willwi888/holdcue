import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AnimStyle,
  LyricLine,
  ProjectLink,
  ProjectMeta,
  Resolution,
  Step,
} from "./types";
import { applyEvenTiming, parseLyrics } from "./demo-data";
import { parseLrc } from "./lrc";
import { uid } from "./utils";
import {
  type CatalogSong,
  syncToLines,
} from "./catalog";

export type ProjectState = ProjectMeta & {
  step: Step;
  lines: LyricLine[];
  audioUrl: string | null;
  audioName: string;
  coverUrl: string | null;
  portraitUrl: string | null;
  usingDemoAudio: boolean;
  usingDemoCover: boolean;
  usingDemoPortrait: boolean;
  catalogSongId: string | null;
  cueIndex: number;
  hydrated: boolean;
};

type Actions = {
  setStep: (step: Step) => void;
  patch: (partial: Partial<ProjectMeta>) => void;
  setLyricsText: (text: string, keepTiming?: boolean) => void;
  importLrc: (text: string) => void;
  setLineTiming: (id: string, start: number | null, end: number | null) => void;
  setCueIndex: (i: number) => void;
  undoLastCue: () => void;
  resetTiming: () => void;
  applyDemoTiming: (duration: number) => void;
  setAudio: (url: string | null, name: string, isDemo: boolean) => void;
  setCover: (url: string | null, isDemo: boolean) => void;
  setPortrait: (url: string | null, isDemo: boolean) => void;
  addLink: () => void;
  updateLink: (id: string, patch: Partial<ProjectLink>) => void;
  removeLink: (id: string) => void;
  loadDemo: (withTiming: boolean) => Promise<void> | void;
  loadCatalogSong: (song: CatalogSong, applySync?: boolean) => void;
  newProject: () => void;
  markHydrated: () => void;
};

const emptyMeta: ProjectMeta = {
  title: "",
  artist: "",
  album: "",
  subtitle: "",
  isrc: "",
  upc: "",
  releaseDate: "",
  label: "",
  lyricsText: "",
  links: [
    { id: uid("link"), label: "YouTube", url: "" },
    { id: uid("link"), label: "Spotify", url: "" },
    { id: uid("link"), label: "Apple Music", url: "" },
  ],
  animStyle: "cinematic",
  resolution: "720p",
  lyricMotion: "rise",
  lyricFont: "sans",
  lyricSize: "m",
  noiseSeconds: 3,
  showCard: true,
  showMeta: true,
  showGraffiti: true,
  karaokeFill: true,
};

function rebuildLines(text: string, prev: LyricLine[]): LyricLine[] {
  const next = parseLyrics(text);
  return next.map((line, i) => {
    const old = prev[i];
    if (old && old.text === line.text) {
      return { ...line, start: old.start, end: old.end };
    }
    const match = prev.find((p) => p.text === line.text && p.start != null);
    if (match) return { ...line, start: match.start, end: match.end };
    return line;
  });
}

export const useProject = create<ProjectState & Actions>()(
  persist(
    (set, get) => ({
      ...emptyMeta,
      step: "home",
      lines: [],
      audioUrl: null,
      audioName: "",
      coverUrl: null,
      portraitUrl: null,
      usingDemoAudio: false,
      usingDemoCover: false,
      usingDemoPortrait: false,
      catalogSongId: null,
      cueIndex: 0,
      hydrated: false,

      setStep: (step) => set({ step }),
      patch: (partial) => set(partial),
      setLyricsText: (text, keepTiming = true) => {
        const lines = keepTiming
          ? rebuildLines(text, get().lines)
          : parseLyrics(text);
        set({ lyricsText: text, lines, cueIndex: 0 });
      },
      importLrc: (text) => {
        const { tags, lines: parsed } = parseLrc(text);
        if (parsed.length === 0) {
          get().setLyricsText(text, false);
          return;
        }
        const lyricsText = parsed.map((l) => l.text).join("\n");
        const lines: LyricLine[] = parsed.map((l, i) => {
          const next = parsed[i + 1];
          const end = next ? Math.max(l.time + 0.2, next.time - 0.05) : l.time + 3;
          return { id: uid("ln"), text: l.text, start: l.time, end };
        });
        set({
          lyricsText,
          lines,
          title: tags.ti || get().title,
          artist: tags.ar || get().artist,
          album: tags.al || get().album,
          cueIndex: lines.length,
        });
      },
      setLineTiming: (id, start, end) =>
        set({
          lines: get().lines.map((l) => (l.id === id ? { ...l, start, end } : l)),
        }),
      setCueIndex: (i) => set({ cueIndex: Math.max(0, i) }),
      undoLastCue: () => {
        const { lines, cueIndex } = get();
        const timed = lines
          .map((l, i) => ({ l, i }))
          .filter((x) => x.l.start != null);
        const last = timed[timed.length - 1];
        if (!last) {
          set({ cueIndex: 0 });
          return;
        }
        set({
          lines: lines.map((l, i) =>
            i === last.i ? { ...l, start: null, end: null } : l,
          ),
          cueIndex: Math.min(last.i, cueIndex),
        });
      },
      resetTiming: () =>
        set({
          lines: get().lines.map((l) => ({ ...l, start: null, end: null })),
          cueIndex: 0,
        }),
      applyDemoTiming: (duration) =>
        set({
          lines: applyEvenTiming(get().lines, duration),
          cueIndex: get().lines.length,
        }),
      setAudio: (url, name, isDemo) =>
        set({ audioUrl: url, audioName: name, usingDemoAudio: isDemo }),
      setCover: (url, isDemo) => set({ coverUrl: url, usingDemoCover: isDemo }),
      setPortrait: (url, isDemo) =>
        set({ portraitUrl: url, usingDemoPortrait: isDemo }),
      addLink: () =>
        set({
          links: [...get().links, { id: uid("link"), label: "", url: "" }],
        }),
      updateLink: (id, patch) =>
        set({
          links: get().links.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        }),
      removeLink: (id) =>
        set({ links: get().links.filter((l) => l.id !== id) }),
      loadCatalogSong: (song, applySync = true) => {
        const lyricsText = song.lyrics || song.sync.map((c) => c.text).join("\n");
        let lines: LyricLine[] = parseLyrics(lyricsText);
        if (applySync && song.sync.length > 0) {
          lines = syncToLines(song.sync);
        } else if (applySync && song.lrc) {
          const parsed = parseLrc(song.lrc).lines;
          if (parsed.length) {
            lines = parsed.map((l, i) => {
              const next = parsed[i + 1];
              const end = next
                ? Math.max(l.time + 0.2, next.time - 0.05)
                : l.time + 3;
              return { id: uid("ln"), text: l.text, start: l.time, end };
            });
          }
        }
        const links = [
          { id: uid("link"), label: "Spotify", url: song.spotifyLink || "" },
          {
            id: uid("link"),
            label: "Apple Music",
            url: song.appleMusicLink || "",
          },
          { id: uid("link"), label: "YouTube", url: song.youtubeUrl || "" },
          {
            id: uid("link"),
            label: "Archive",
            url: `https://willwi-music-db-j3h8.vercel.app/song/${encodeURIComponent(song.id)}`,
          },
        ];
        const firstLine = lines[0]?.text ?? "";
        set({
          title: song.title,
          artist: "Willwi",
          album: song.albumName,
          subtitle: firstLine,
          isrc: song.isrc || "",
          upc: song.upc || "",
          releaseDate: song.releaseDate || "",
          label: song.labelName || "Willwi Music",
          lyricsText,
          lines,
          links,
          audioUrl: song.audioUrl,
          audioName: song.audioUrl
            ? `${song.title}.mp3`
            : "",
          coverUrl: song.coverUrl,
          portraitUrl: song.coverUrl,
          usingDemoAudio: false,
          usingDemoCover: false,
          usingDemoPortrait: false,
          catalogSongId: song.id,
          cueIndex: lines.some((l) => l.start != null) ? lines.length : 0,
          animStyle: "cinematic",
          resolution: "720p",
          showCard: true,
          showMeta: true,
          showGraffiti: true,
          karaokeFill: true,
          step: "setup",
        });
      },
      loadDemo: async (withTiming) => {
        try {
          const { getCatalogSong, KONGWEI_ID } = await import("./catalog");
          const song = await getCatalogSong(KONGWEI_ID);
          get().loadCatalogSong(song, withTiming);
        } catch {
          const { DEMO_AUDIO, DEMO_COVER, DEMO_LINKS, DEMO_LYRICS, DEMO_META, DEMO_PORTRAIT } =
            await import("./demo-data");
          const lines = parseLyrics(DEMO_LYRICS);
          set({
            ...DEMO_META,
            links: DEMO_LINKS.map((l) => ({ ...l })),
            lyricsText: DEMO_LYRICS,
            lines: withTiming ? applyEvenTiming(lines) : lines,
            audioUrl: DEMO_AUDIO,
            audioName: "demo-empty-seat.mp3",
            coverUrl: DEMO_COVER,
            portraitUrl: DEMO_PORTRAIT,
            usingDemoAudio: true,
            usingDemoCover: true,
            usingDemoPortrait: true,
            catalogSongId: null,
            cueIndex: withTiming ? lines.length : 0,
            animStyle: "cinematic" as AnimStyle,
            resolution: "720p" as Resolution,
            showCard: true,
            showMeta: true,
            showGraffiti: true,
            karaokeFill: true,
            step: "setup",
          });
        }
      },
      newProject: () =>
        set({
          ...emptyMeta,
          links: emptyMeta.links.map((l) => ({ ...l, id: uid("link") })),
          lines: [],
          audioUrl: null,
          audioName: "",
          coverUrl: null,
          portraitUrl: null,
          usingDemoAudio: false,
          usingDemoCover: false,
          usingDemoPortrait: false,
          catalogSongId: null,
          cueIndex: 0,
          step: "setup",
        }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "holdcue-project",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        title: s.title,
        artist: s.artist,
        album: s.album,
        subtitle: s.subtitle,
        isrc: s.isrc,
        upc: s.upc,
        releaseDate: s.releaseDate,
        label: s.label,
        lyricsText: s.lyricsText,
        links: s.links,
        animStyle: s.animStyle,
        resolution: s.resolution,
        lyricMotion: s.lyricMotion,
        lyricFont: s.lyricFont,
        lyricSize: s.lyricSize,
        noiseSeconds: s.noiseSeconds,
        showCard: s.showCard,
        showMeta: s.showMeta,
        showGraffiti: s.showGraffiti,
        karaokeFill: s.karaokeFill,
        lines: s.lines,
        cueIndex: s.cueIndex,
        step: s.step,
        audioName: s.audioName,
        usingDemoAudio: s.usingDemoAudio,
        usingDemoCover: s.usingDemoCover,
        usingDemoPortrait: s.usingDemoPortrait,
        catalogSongId: s.catalogSongId,
        audioUrl: persistMediaUrl(s.audioUrl, s.usingDemoAudio, "/demo/audio.mp3"),
        coverUrl: persistMediaUrl(s.coverUrl, s.usingDemoCover, "/demo/cover.jpg"),
        portraitUrl: persistMediaUrl(
          s.portraitUrl,
          s.usingDemoPortrait,
          "/demo/portrait.jpg",
        ),
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ProjectState>;
        return {
          ...current,
          ...p,
          lyricFont: p.lyricFont ?? "sans",
          lyricSize: p.lyricSize ?? "m",
          lyricMotion: p.lyricMotion ?? "rise",
        };
      },
    },
  ),
);

export function timedCount(lines: LyricLine[]): number {
  return lines.filter((l) => l.start != null && l.end != null).length;
}

function persistMediaUrl(
  url: string | null,
  isDemo: boolean,
  demoPath: string,
): string | null {
  if (isDemo) return demoPath;
  if (url && /^https?:\/\//.test(url)) return url;
  return null;
}

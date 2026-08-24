export const CLIP_SRC = {
  in: "/metro/video/in.mp4",
  play: "/metro/video/play.mp4",
  out: "/metro/video/out.mp4",
} as const;

export type ClipKind = keyof typeof CLIP_SRC;

export type LiveAssets = {
  clips: Record<ClipKind, string>;
  bg: string;
  poster: string;
  led: string;
};

export const DEFAULT_LIVE: LiveAssets = {
  clips: { ...CLIP_SRC },
  bg: "/metro/video/bg.mp4",
  poster: "/metro/covers/album-main.jpg",
  led: "WILLWI 情緒線　本班車不開往快樂",
};

let live: LiveAssets = {
  clips: { ...CLIP_SRC },
  bg: DEFAULT_LIVE.bg,
  poster: DEFAULT_LIVE.poster,
  led: DEFAULT_LIVE.led,
};
const listeners = new Set<() => void>();

export function getLiveAssets(): LiveAssets {
  return live;
}

export function applyCopyToLive(copy: Record<string, string>) {
  live = {
    clips: {
      in: copy.ident_in_url?.trim() || CLIP_SRC.in,
      play: copy.ident_play_url?.trim() || CLIP_SRC.play,
      out: copy.ident_out_url?.trim() || CLIP_SRC.out,
    },
    bg: copy.bg_url?.trim() || DEFAULT_LIVE.bg,
    poster: copy.poster_url?.trim() || DEFAULT_LIVE.poster,
    led: copy.line_led?.trim() || DEFAULT_LIVE.led,
  };
  listeners.forEach((fn) => fn());
}

export function onLiveAssets(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

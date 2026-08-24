const SRC = {
  in: "/metro/audio/in.mp3",
  out: "/metro/audio/out.mp3",
  play: "/metro/audio/play.mp3",
} as const;

export type SfxKind = keyof typeof SRC;

let current: HTMLAudioElement | null = null;
let currentKind: SfxKind | null = null;
let chainToken = 0;

export function stopMetroSfx() {
  chainToken += 1;
  if (!current) return;
  current.pause();
  current.onended = null;
  current = null;
  currentKind = null;
}

export function isSfxPlaying(kind?: SfxKind): boolean {
  if (!current || current.paused) return false;
  if (kind) return currentKind === kind;
  return true;
}

export function playMetroSfx(kind: SfxKind, onEnded?: () => void): HTMLAudioElement {
  const my = ++chainToken;
  if (current) {
    current.pause();
    current.onended = null;
  }
  const el = new Audio(SRC[kind]);
  el.preload = "auto";
  current = el;
  currentKind = kind;
  el.onended = () => {
    if (current === el) {
      current = null;
      currentKind = null;
    }
    if (my === chainToken) onEnded?.();
  };
  void el.play().catch(() => {
    if (my === chainToken) onEnded?.();
  });
  return el;
}

export function playChain(kinds: SfxKind[], onEnded?: () => void) {
  const run = (i: number) => {
    if (i >= kinds.length) {
      onEnded?.();
      return;
    }
    playMetroSfx(kinds[i]!, () => run(i + 1));
  };
  run(0);
}

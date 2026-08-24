import { useEffect, useRef, useState } from "react";
import { CLIP_SRC, getLiveAssets, onLiveAssets, type ClipKind } from "@/lib/metro-live";

export { CLIP_SRC };
export type { ClipKind };

export function MetroClip({
  kind,
  onEnded,
  skipLabel = "略過",
}: {
  kind: ClipKind;
  onEnded: () => void;
  skipLabel?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [src, setSrc] = useState(() => getLiveAssets().clips[kind]);

  useEffect(() => {
    setSrc(getLiveAssets().clips[kind]);
    return onLiveAssets(() => setSrc(getLiveAssets().clips[kind]));
  }, [kind]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setBlocked(false);
    el.currentTime = 0;
    const play = el.play();
    if (play) void play.catch(() => setBlocked(true));
  }, [kind, src]);

  const kick = () => {
    setBlocked(false);
    void ref.current?.play().catch(() => setBlocked(true));
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <video
        ref={ref}
        src={src}
        playsInline
        className="h-full w-full object-cover"
        onEnded={onEnded}
      />
      {blocked && (
        <button
          type="button"
          className="metro-pill absolute inset-x-8 bottom-24 py-3 text-sm"
          onClick={kick}
        >
          輕觸播放
        </button>
      )}
      <button
        type="button"
        className="absolute bottom-8 right-6 text-xs tracking-[0.18em] text-white/70"
        onClick={onEnded}
      >
        {skipLabel}
      </button>
    </div>
  );
}

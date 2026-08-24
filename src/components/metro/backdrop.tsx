import { useEffect, useState } from "react";
import { getLiveAssets, onLiveAssets } from "@/lib/metro-live";

export function MetroBackdrop() {
  const [src, setSrc] = useState(() => getLiveAssets().bg);
  const [poster, setPoster] = useState(() => getLiveAssets().poster);

  useEffect(() => {
    const sync = () => {
      const live = getLiveAssets();
      setSrc(live.bg);
      setPoster(live.poster);
    };
    sync();
    return onLiveAssets(sync);
  }, []);

  return (
    <video
      className="metro-bg"
      src={src}
      autoPlay
      muted
      loop
      playsInline
      poster={poster}
      aria-hidden
    />
  );
}

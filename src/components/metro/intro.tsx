import { useState } from "react";
import { INTRO_SEEN_KEY } from "@/lib/metro";
import { stopMetroSfx } from "@/lib/metro-sfx";
import { MetroClip, type ClipKind } from "@/components/metro/clip";

export function MetroIntro({ onEnter }: { onEnter: () => void }) {
  const [kind, setKind] = useState<ClipKind>("in");

  const finish = () => {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    stopMetroSfx();
    onEnter();
  };

  return (
    <MetroClip
      kind={kind}
      skipLabel={kind === "in" ? "下一鏡" : "進入月台"}
      onEnded={() => {
        if (kind === "in") setKind("play");
        else finish();
      }}
    />
  );
}

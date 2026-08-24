import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SyncedStage } from "@/components/lyrics/synced-stage";
import { MetroBackdrop } from "@/components/metro/backdrop";
import { listPublicStations, type StationPublic } from "@/lib/metro-cms";
import { readPass } from "@/lib/pass-session";
import type { CatalogSong } from "@/lib/catalog";

export const Route = createFileRoute("/lyrics")({ component: LyricsPage });

function toTrack(station: StationPublic): CatalogSong {
  return {
    id: station.slug,
    title: station.title,
    albumName: "WILLWI 情緒捷運線",
    coverUrl: station.coverUrl || "/metro/covers/album-main.jpg",
    audioUrl: station.audioPlayUrl,
    releaseDate: null,
    versionLabel: "",
    isrc: null,
    upc: null,
    hasLyrics: Boolean(station.copy),
    lyrics: station.copy,
    lrc: null,
    labelName: "Willwi Music",
    spotifyLink: null,
    appleMusicLink: null,
    youtubeUrl: null,
    sync: [],
  };
}

function LyricsPage() {
  const navigate = useNavigate();
  const [song, setSong] = useState<CatalogSong | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const pass = readPass();
    if (!pass?.canLyrics) {
      setDenied(true);
      return;
    }
    void listPublicStations()
      .then((rows) => {
        const hit = rows.find((row) => row.audioPlayUrl) ?? rows[0];
        setSong(hit ? toTrack(hit) : null);
      })
      .catch(() => setSong(null));
  }, []);

  if (denied) {
    return (
      <div className="metro-skin grid min-h-dvh place-items-center px-6 text-center">
        <MetroBackdrop />
        <div className="metro-dim" />
        <div className="relative z-10">
          <p className="text-xs tracking-[0.22em] text-amber-200">動態歌詞</p>
          <h1 className="mt-4 font-display text-2xl font-extrabold">
            這一站要今晚的票。
          </h1>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/support" search={{ next: "" }} className="text-sm text-amber-200">
              深夜模式
            </Link>
            <Link to="/enter" className="text-sm text-white/50">
              我有票
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="metro-skin grid min-h-dvh place-items-center text-amber-200/70">
        <MetroBackdrop />
        <div className="metro-dim" />
        <p className="relative z-10 font-display text-sm tracking-[0.28em]">情緒捷運線</p>
      </div>
    );
  }

  return (
    <div>
      <div className="absolute left-4 top-4 z-20 flex gap-3 text-xs">
        <Link to="/" className="text-white/60 hover:text-white">
          月台
        </Link>
        {readPass()?.canTime ? (
          <button
            type="button"
            className="text-white/60 hover:text-white"
            onClick={() => void navigate({ to: "/" })}
          >
            對時
          </button>
        ) : null}
      </div>
      <SyncedStage song={song} />
    </div>
  );
}

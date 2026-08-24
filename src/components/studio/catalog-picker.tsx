import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ExternalLink, Loader2, Music2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ARCHIVE_SITE,
  type CatalogSongListItem,
  getCatalogSong,
  isInstrumental,
  listCatalogSongs,
  uniqueAlbums,
} from "@/lib/catalog";
import { useProject } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CatalogPicker({ compact = false }: { compact?: boolean }) {
  const loadCatalogSong = useProject((s) => s.loadCatalogSong);
  const catalogSongId = useProject((s) => s.catalogSongId);
  const [songs, setSongs] = useState<CatalogSongListItem[]>([]);
  const [query, setQuery] = useState("");
  const [album, setAlbum] = useState<string | null>(null);
  const [hideInst, setHideInst] = useState(true);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const rows = await listCatalogSongs();
        if (!cancel) {
          setSongs(rows);
          setStatus("ready");
        }
      } catch {
        if (!cancel) setStatus("error");
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const albums = useMemo(() => uniqueAlbums(songs), [songs]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return songs.filter((s) => {
      if (hideInst && isInstrumental(s)) return false;
      if (album && s.albumName !== album) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.albumName.toLowerCase().includes(q) ||
        (s.isrc ?? "").toLowerCase().includes(q)
      );
    });
  }, [songs, query, album, hideInst]);

  const pick = async (id: string, applySync = true) => {
    setPicking(id);
    try {
      const song = await getCatalogSong(id);
      loadCatalogSong(song, applySync);
      const timed = applySync && (song.sync.length > 0 || Boolean(song.lrc));
      toast.success(
        timed
          ? `已載入《${song.title}》，並帶入 Archive 對時`
          : `已載入《${song.title}》`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setPicking(null);
    }
  };

  return (
    <section
      className={cn(
        "rounded-[24px] bg-surface shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)]",
        compact ? "p-4" : "p-5 sm:p-6",
      )}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold tracking-wide">
            Willwi Archive
          </h2>
          <p className="mt-1 text-xs text-subtle">
            對標官方音樂庫，帶入封面、音源、歌詞、ISRC 與發行資料。
          </p>
        </div>
        <a
          href={`${ARCHIVE_SITE}/database`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted transition-[color] duration-150 hover:text-fg"
        >
          打開音樂庫
          <ExternalLink className="size-3" />
        </a>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <Input
          value={query}
          placeholder="搜尋歌名、專輯、ISRC"
          className="pl-9"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setHideInst((v) => !v)}
          className={cn(
            "h-8 rounded-full px-3 text-xs transition-[background-color,color] duration-150",
            hideInst
              ? "bg-accent text-accent-fg"
              : "bg-surface-2 text-muted",
          )}
        >
          隱藏伴奏
        </button>
        <span className="text-xs tabular text-subtle">
          {status === "ready" ? `${visible.length} 首` : ""}
        </span>
      </div>

      {status === "ready" && !query && (
        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
          <AlbumChip
            name="全部"
            on={album == null}
            coverUrl={null}
            onClick={() => setAlbum(null)}
          />
          {albums.slice(0, 16).map((a) => (
            <AlbumChip
              key={a.name}
              name={a.name}
              coverUrl={a.coverUrl}
              on={album === a.name}
              onClick={() => setAlbum(album === a.name ? null : a.name)}
            />
          ))}
        </div>
      )}

      {status === "loading" && (
        <p className="flex items-center gap-2 py-8 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" />
          正在讀取 Archive…
        </p>
      )}
      {status === "error" && (
        <p className="py-6 text-sm text-muted">
          目前連不上音樂庫。可以改為手動上傳音源與歌詞。
        </p>
      )}

      {status === "ready" && (
        <ul className="max-h-80 space-y-0.5 overflow-y-auto pr-1">
          {visible.slice(0, 80).map((song) => {
            const active = catalogSongId === song.id;
            const busy = picking === song.id;
            return (
              <li key={song.id}>
                <button
                  type="button"
                  disabled={Boolean(picking)}
                  onClick={() => void pick(song.id, true)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[14px] px-2 py-2 text-left transition-[background-color] duration-150",
                    active ? "bg-accent/15" : "hover:bg-surface-2",
                  )}
                >
                  {song.coverUrl ? (
                    <img
                      src={song.coverUrl}
                      alt=""
                      className="size-11 shrink-0 rounded-[8px] object-cover outline outline-1 -outline-offset-1 outline-white/10"
                    />
                  ) : (
                    <span className="grid size-11 shrink-0 place-items-center rounded-[8px] bg-surface-2 text-muted">
                      <Music2 className="size-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {song.title}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {song.albumName}
                      {song.releaseDate ? ` · ${song.releaseDate.slice(0, 4)}` : ""}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-[10px] tracking-wide text-subtle sm:block">
                    {song.audioUrl ? "音源" : ""}
                    {song.audioUrl && song.hasLyrics ? " · " : ""}
                    {song.hasLyrics ? "歌詞" : ""}
                    {busy ? " …" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {status === "ready" && visible.length === 0 && (
        <p className="py-6 text-sm text-muted">沒有符合的歌曲。</p>
      )}
    </section>
  );
}

function AlbumChip({
  name,
  coverUrl,
  on,
  onClick,
}: {
  name: string;
  coverUrl: string | null;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 shrink-0 items-center gap-2 rounded-full pl-1 pr-3 text-xs transition-[background-color,color] duration-150",
        on ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg",
      )}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="size-6 rounded-full object-cover"
        />
      ) : (
        <span className="size-6" />
      )}
      {name}
    </button>
  );
}

export function LoadKongweiButton({
  children,
  withTiming = false,
  then,
}: {
  children: ReactNode;
  withTiming?: boolean;
  then?: () => void;
}) {
  const loadDemo = useProject((s) => s.loadDemo);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void Promise.resolve(loadDemo(withTiming)).finally(() => {
          setBusy(false);
          then?.();
        });
      }}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

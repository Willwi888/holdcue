import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ARCHIVE_SITE,
  type CatalogSongListItem,
  getCatalogSong,
  isInstrumental,
  listCatalogSongs,
} from "@/lib/catalog";
import { clearPass, readPass } from "@/lib/pass-session";
import { useProject } from "@/lib/store";

export function ClassicPicker() {
  const loadCatalogSong = useProject((s) => s.loadCatalogSong);
  const setStep = useProject((s) => s.setStep);
  const [songs, setSongs] = useState<CatalogSongListItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [picking, setPicking] = useState<string | null>(null);
  const pass = readPass();

  useEffect(() => {
    let cancel = false;
    void listCatalogSongs()
      .then((rows) => {
        if (!cancel) {
          setSongs(rows);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancel) setStatus("error");
      });
    return () => {
      cancel = true;
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return songs.filter((s) => {
      if (isInstrumental(s)) return false;
      if (!s.hasLyrics) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.albumName.toLowerCase().includes(q)
      );
    });
  }, [songs, query]);

  const pick = async (id: string) => {
    setPicking(id);
    try {
      const song = await getCatalogSong(id);
      if (!song.lyrics.trim() && song.sync.length === 0) {
        throw new Error("這首還沒有歌詞，換下一首。");
      }
      loadCatalogSong(song, false);
      useProject.getState().resetTiming();
      useProject.getState().setCueIndex(0);
      setStep("cue");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setPicking(null);
    }
  };

  return (
    <div className="classic-skin min-h-dvh bg-white text-[#3d3d3d]">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-5 py-6">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#e85a12]">
            HOLDCUE
          </p>
          <h1 className="mt-1 text-xl font-medium text-[#222]">挑選一首歌</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#888]">
          <span>{pass?.name}</span>
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => {
              clearPass();
              window.dispatchEvent(new Event("metro-pass"));
            }}
          >
            出站
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 pb-16">
        <p className="text-sm leading-relaxed text-[#666]">
          從官方音樂庫選一首。進站後按住空白鍵對時，放開就跳下一句。
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋歌名或專輯"
          className="mt-5 h-11 w-full rounded-none border-0 border-b border-[#ddd] bg-transparent px-0 text-base outline-none focus:border-[#e85a12]"
        />

        {status === "loading" && (
          <p className="py-16 text-center text-sm text-[#888]">正在讀取音樂庫…</p>
        )}
        {status === "error" && (
          <p className="py-16 text-center text-sm text-[#888]">
            連不上音樂庫。請稍後再試，或到
            <a className="ml-1 text-[#e85a12]" href={ARCHIVE_SITE} target="_blank" rel="noreferrer">
              官方紀錄
            </a>
            確認。
          </p>
        )}

        {status === "ready" && (
          <ul className="mt-6 divide-y divide-[#eee]">
            {visible.map((song) => (
              <li key={song.id}>
                <button
                  type="button"
                  disabled={Boolean(picking)}
                  onClick={() => void pick(song.id)}
                  className="flex w-full items-center gap-3 py-3 text-left disabled:opacity-50"
                >
                  {song.coverUrl ? (
                    <img
                      src={song.coverUrl}
                      alt=""
                      className="size-12 shrink-0 rounded-sm object-cover"
                    />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center bg-[#f3f3f3] text-xs text-[#aaa]">
                      曲
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-[#222]">
                      {song.title}
                    </span>
                    <span className="block truncate text-xs text-[#888]">
                      {song.albumName}
                      {song.releaseDate ? ` · ${song.releaseDate}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-[#e85a12]">
                    {picking === song.id ? "載入中" : "對時"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {status === "ready" && visible.length === 0 && (
          <p className="py-16 text-center text-sm text-[#888]">沒有符合的歌。</p>
        )}
      </div>
    </div>
  );
}

import { uid } from "./utils";
import type { LyricLine } from "./types";

const ARCHIVE_REST = "https://rzxqseimxhbokrhcdjbi.supabase.co/rest/v1";
const ARCHIVE_KEY = "sb_publishable_z_v9ig8SbqNnKHHTwEgOhw_S3g4yhba";
export const ARCHIVE_SITE = "https://willwi-music-db-j3h8.vercel.app";
export const KONGWEI_ID = "1778782427035734";

export type CatalogSyncCue = {
  text: string;
  startTime: number;
  endTime: number;
};

export type CatalogSongListItem = {
  id: string;
  title: string;
  albumName: string;
  coverUrl: string | null;
  audioUrl: string | null;
  releaseDate: string | null;
  versionLabel: string;
  isrc: string | null;
  upc: string | null;
  hasLyrics: boolean;
};

export type CatalogSong = CatalogSongListItem & {
  lyrics: string;
  lrc: string | null;
  labelName: string;
  spotifyLink: string | null;
  appleMusicLink: string | null;
  youtubeUrl: string | null;
  sync: CatalogSyncCue[];
};

const LIST_SELECT =
  "id,title,album_name,cover_url,audio_url,custom_audio_link,release_date,version_label,isrc,upc,lyrics";

const DETAIL_SELECT =
  LIST_SELECT +
  ",lrc,label_name,spotify_link,apple_music_link,youtube_url,spotify_id,ai_sync_data,credits";

async function archiveGet<T>(path: string): Promise<T> {
  const res = await fetch(`${ARCHIVE_REST}${path}`, {
    headers: {
      apikey: ARCHIVE_KEY,
      Authorization: `Bearer ${ARCHIVE_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Archive ${res.status}`);
  }
  return (await res.json()) as T;
}

type RawSong = {
  id: string;
  title: string | null;
  album_name: string | null;
  cover_url: string | null;
  audio_url: string | null;
  custom_audio_link: string | null;
  release_date: string | null;
  version_label: string | null;
  isrc: string | null;
  upc: string | null;
  lyrics: string | null;
  lrc?: string | null;
  label_name?: string | null;
  spotify_link?: string | null;
  apple_music_link?: string | null;
  youtube_url?: string | null;
  spotify_id?: string | null;
  ai_sync_data?: CatalogSyncCue[] | null;
};

function audioOf(row: RawSong): string | null {
  return row.audio_url || row.custom_audio_link || null;
}

function toListItem(row: RawSong): CatalogSongListItem {
  return {
    id: row.id,
    title: row.title?.trim() || "未命名",
    albumName: row.album_name?.trim() || "單曲",
    coverUrl: row.cover_url,
    audioUrl: audioOf(row),
    releaseDate: row.release_date,
    versionLabel: row.version_label?.trim() || "",
    isrc: row.isrc,
    upc: row.upc,
    hasLyrics: Boolean(row.lyrics && row.lyrics.trim()),
  };
}

function parseSync(raw: unknown): CatalogSyncCue[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      const text = String(rec.text ?? "").trim();
      const start = Number(rec.startTime);
      const end = Number(rec.endTime);
      if (!text || !Number.isFinite(start) || !Number.isFinite(end)) return null;
      return { text, startTime: start, endTime: Math.max(start + 0.08, end) };
    })
    .filter((x): x is CatalogSyncCue => Boolean(x));
}

function toDetail(row: RawSong): CatalogSong {
  const spotify =
    row.spotify_link ||
    (row.spotify_id ? `https://open.spotify.com/track/${row.spotify_id}` : null);
  return {
    ...toListItem(row),
    lyrics: (row.lyrics ?? "").trim(),
    lrc: row.lrc ?? null,
    labelName: row.label_name?.trim() || "Willwi Music",
    spotifyLink: spotify,
    appleMusicLink: row.apple_music_link ?? null,
    youtubeUrl: row.youtube_url ?? null,
    sync: parseSync(row.ai_sync_data),
  };
}

let listCache: CatalogSongListItem[] | null = null;

export async function listCatalogSongs(): Promise<CatalogSongListItem[]> {
  if (listCache) return listCache;
  const rows = await archiveGet<RawSong[]>(
    `/songs?select=${LIST_SELECT}&order=release_date.desc.nullslast&limit=500`,
  );
  listCache = rows.map(toListItem);
  return listCache;
}

export async function getCatalogSong(id: string): Promise<CatalogSong> {
  const rows = await archiveGet<RawSong[]>(
    `/songs?id=eq.${encodeURIComponent(id)}&select=${DETAIL_SELECT}&limit=1`,
  );
  const row = rows[0];
  if (!row) throw new Error("找不到這首歌");
  return toDetail(row);
}

export function isInstrumental(song: { title: string; versionLabel: string }): boolean {
  const blob = `${song.title} ${song.versionLabel}`.toLowerCase();
  return blob.includes("instrumental") || blob.includes("inst.") || blob.includes("伴奏");
}

export function uniqueAlbums(songs: CatalogSongListItem[]): {
  name: string;
  coverUrl: string | null;
  count: number;
}[] {
  const map = new Map<string, { name: string; coverUrl: string | null; count: number }>();
  for (const s of songs) {
    const cur = map.get(s.albumName);
    if (cur) {
      cur.count += 1;
      if (!cur.coverUrl && s.coverUrl) cur.coverUrl = s.coverUrl;
    } else {
      map.set(s.albumName, {
        name: s.albumName,
        coverUrl: s.coverUrl,
        count: 1,
      });
    }
  }
  return [...map.values()];
}

export function syncToLines(sync: CatalogSyncCue[]): LyricLine[] {
  return sync.map((cue) => ({
    id: uid("ln"),
    text: cue.text,
    start: cue.startTime,
    end: cue.endTime,
  }));
}

export function songPageUrl(id: string): string {
  return `${ARCHIVE_SITE}/song/${encodeURIComponent(id)}`;
}

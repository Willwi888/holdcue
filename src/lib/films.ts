import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type FinishedFilm = {
  id: string;
  title: string;
  artist: string;
  album: string;
  caption: string;
  coverB64: string | null;
  videoUrl: string | null;
  videoMime: string;
  hasFile: boolean;
  createdAt: string;
  playUrl: string;
};

export const MAX_FILM_BYTES = 12 * 1024 * 1024;

const FilmInput = z.object({
  title: z.string().trim().min(1).max(80),
  artist: z.string().trim().max(80).optional(),
  album: z.string().trim().max(80).optional(),
  caption: z.string().trim().max(200).optional(),
  coverB64: z.string().max(500_000).optional(),
  videoB64: z.string().max(18_000_000).optional(),
  videoMime: z.string().max(80).optional(),
  videoUrl: z.string().trim().max(600).optional(),
});

function playUrlOf(row: {
  id: string;
  hasFile: boolean;
  videoUrl: string | null;
}): string {
  if (row.hasFile) return `/api/films/${encodeURIComponent(row.id)}`;
  return row.videoUrl || "";
}

export const listFinishedFilms = createServerFn({ method: "GET" }).handler(
  async (): Promise<FinishedFilm[]> => {
    const { selectFilms } = await import("./films.server");
    const rows = await selectFilms();
    return rows.map((row) => ({ ...row, playUrl: playUrlOf(row) }));
  },
);

export const addFinishedFilm = createServerFn({ method: "POST" })
  .validator(FilmInput)
  .handler(async ({ data }): Promise<FinishedFilm> => {
    const title = data.title.trim();
    const artist = (data.artist ?? "Willwi").trim() || "Willwi";
    const album = (data.album ?? "").trim();
    const caption = (data.caption ?? "").trim();
    const videoUrl = sanitizeVideoUrl(data.videoUrl);
    const videoB64 = data.videoB64?.trim() || null;
    const coverB64 = sanitizeCover(data.coverB64);
    if (!videoB64 && !videoUrl) {
      throw new Error("請上傳影片檔，或貼上可播放的網址");
    }
    if (videoB64 && videoB64.length > 18_000_000) {
      throw new Error("影片太大，請壓到約 12MB 以內");
    }
    const id = `film-${Date.now().toString(36)}`;
    const { insertFilm, selectFilms } = await import("./films.server");
    await insertFilm({
      id,
      title,
      artist,
      album,
      caption,
      coverB64,
      videoB64,
      videoMime: data.videoMime || "video/mp4",
      videoUrl,
    });
    const rows = await selectFilms();
    const created = rows.find((row) => row.id === id);
    if (!created) throw new Error("上傳後找不到完成品");
    return { ...created, playUrl: playUrlOf(created) };
  });

export const removeFinishedFilm = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const { deleteFilm } = await import("./films.server");
    await deleteFilm(data.id);
    return { ok: true as const };
  });

function sanitizeVideoUrl(raw: string | undefined): string | null {
  const url = (raw ?? "").trim();
  if (!url) return null;
  if (!/^https:\/\//i.test(url)) {
    throw new Error("影片網址需為 https");
  }
  return url;
}

function sanitizeCover(raw: string | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (!value.startsWith("data:image/")) {
    throw new Error("封面格式不正確");
  }
  return value;
}

export function youtubeIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "") || null;
    }
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

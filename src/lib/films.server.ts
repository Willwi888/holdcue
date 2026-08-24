import { getSql } from "@/lib/db";

export type FilmRow = {
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
};

type RawFilm = {
  id: string;
  title: string;
  artist: string;
  album: string;
  caption: string;
  cover_b64: string | null;
  video_url: string | null;
  video_mime: string;
  has_file: number;
  created_at: string;
};

export async function selectFilms(): Promise<FilmRow[]> {
  const sql = await getSql();
  const rows = await sql<RawFilm>`
    select
      id,
      title,
      artist,
      album,
      caption,
      cover_b64,
      video_url,
      video_mime,
      (case when video_b64 is null then 0 else 1 end)::int as has_file,
      created_at
    from finished_films
    order by created_at desc
    limit 24
  `;
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    caption: row.caption,
    coverB64: row.cover_b64,
    videoUrl: row.video_url,
    videoMime: row.video_mime,
    hasFile: Number(row.has_file) === 1,
    createdAt: String(row.created_at),
  }));
}

export async function insertFilm(input: {
  id: string;
  title: string;
  artist: string;
  album: string;
  caption: string;
  coverB64: string | null;
  videoB64: string | null;
  videoMime: string;
  videoUrl: string | null;
}): Promise<void> {
  const sql = await getSql();
  const countRows = await sql<{ n: number }>`select count(*)::int as n from finished_films`;
  const n = countRows[0]?.n ?? 0;
  if (n >= 8) {
    throw new Error("完成品牆最多 8 部，請先拿掉一部再上傳");
  }
  await sql`
    insert into finished_films (
      id, title, artist, album, caption, cover_b64, video_b64, video_mime, video_url
    ) values (
      ${input.id},
      ${input.title},
      ${input.artist},
      ${input.album},
      ${input.caption},
      ${input.coverB64},
      ${input.videoB64},
      ${input.videoMime},
      ${input.videoUrl}
    )
  `;
}

export async function deleteFilm(id: string): Promise<void> {
  const sql = await getSql();
  await sql`delete from finished_films where id = ${id}`;
}

export async function selectFilmMedia(id: string): Promise<{
  videoB64: string | null;
  videoMime: string;
  videoUrl: string | null;
} | null> {
  const sql = await getSql();
  const rows = await sql<{
    video_b64: string | null;
    video_mime: string;
    video_url: string | null;
  }>`
    select video_b64, video_mime, video_url
    from finished_films
    where id = ${id}
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    videoB64: row.video_b64,
    videoMime: row.video_mime,
    videoUrl: row.video_url,
  };
}

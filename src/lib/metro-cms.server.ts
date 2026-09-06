import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { METRO_STATIONS } from "@/lib/metro";

export type StationPublic = {
  slug: string;
  code: string;
  title: string;
  en: string;
  desc: string;
  copy: string;
  coverUrl: string | null;
  audioPlayUrl: string | null;
};

export type StationDesk = StationPublic & {
  audioUrl: string | null;
  hasFile: boolean;
  sortOrder: number;
  isOpen: boolean;
};

type StationRow = {
  slug: string;
  code: string;
  title: string;
  en: string;
  sort_order: number;
  desc_text: string;
  copy_text: string;
  audio_url: string | null;
  audio_mime: string;
  cover_url: string | null;
  has_file: number;
  is_open: number;
};

const SECRET_COPY = /^(desk_|.*_hash$)/i;

const DEFAULT_COPY: Record<string, string> = {
  night_kicker: "深夜情緒模式",
  night_lead: "這一站比較暗。",
  night_body:
    "你可以只是坐著。\n也可以把名字留下來，讓我們知道你來過。\n\n不用對時也沒關係。\n留下來，不是為了完成什麼。\n是因為這首歌還想記得你。",
  night_cta: "我在這裡",
  night_issued: "這是今晚的票。出站就作廢。我們不會再問一次。",
  ident_in_url: "",
  ident_play_url: "",
  ident_out_url: "",
  bg_url: "",
  poster_url: "",
  line_led: "WILLWI 情緒線　本班車不開往快樂",
};

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeEq(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  const size = Math.max(left.length, right.length, 1);
  const pa = Buffer.alloc(size);
  const pb = Buffer.alloc(size);
  left.copy(pa);
  right.copy(pb);
  return timingSafeEqual(pa, pb) && left.length === right.length;
}

function envDeskPhrase(): string {
  const raw =
    (typeof process !== "undefined" && process.env.DESK_PASSPHRASE) || "WILLWI";
  return raw.trim();
}

function playUrl(row: { slug: string; audio_url: string | null; has_file: number }): string | null {
  if (row.has_file || row.audio_url) return `/api/stations/${encodeURIComponent(row.slug)}/audio`;
  return null;
}

function toPublic(row: StationRow): StationPublic {
  return {
    slug: row.slug,
    code: row.code,
    title: row.title,
    en: row.en,
    desc: row.desc_text,
    copy: row.copy_text,
    coverUrl: row.cover_url,
    audioPlayUrl: playUrl(row),
  };
}

function slugify(title: string, en: string): string {
  const fromEn = en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return fromEn || `st-${randomBytes(3).toString("hex")}`;
}

async function ensureSeeded() {
  const sql = await getSql();
  const existing = await sql<{ n: number }>`select count(*)::int as n from metro_stations`;
  if ((existing[0]?.n ?? 0) > 0) return;
  for (const st of METRO_STATIONS) {
    await sql`
      insert into metro_stations (slug, code, title, en, sort_order, desc_text, copy_text)
      values (${st.slug}, ${st.code}, ${st.title}, ${st.en}, ${METRO_STATIONS.indexOf(st) + 1}, ${st.desc}, ${st.lyrics})
      on conflict (slug) do nothing
    `;
  }
}

export async function listPublicStations(): Promise<StationPublic[]> {
  await ensureSeeded();
  const sql = await getSql();
  const rows = await sql<StationRow>`
    select
      slug, code, title, en, sort_order, desc_text, copy_text,
      audio_url, audio_mime, cover_url,
      (case when audio_b64 is null then 0 else 1 end)::int as has_file,
      coalesce(is_open, 1)::int as is_open
    from metro_stations
    where coalesce(is_open, 1) = 1
    order by sort_order asc
  `;
  return rows.map(toPublic);
}

export async function listDeskStations(): Promise<StationDesk[]> {
  await ensureSeeded();
  const sql = await getSql();
  const rows = await sql<StationRow>`
    select
      slug, code, title, en, sort_order, desc_text, copy_text,
      audio_url, audio_mime, cover_url,
      (case when audio_b64 is null then 0 else 1 end)::int as has_file,
      coalesce(is_open, 1)::int as is_open
    from metro_stations
    order by sort_order asc
  `;
  return rows.map((row) => ({
    ...toPublic(row),
    audioUrl: row.audio_url,
    hasFile: row.has_file === 1,
    sortOrder: row.sort_order,
    isOpen: row.is_open !== 0,
  }));
}

export async function updateStation(input: {
  slug: string;
  title: string;
  en: string;
  desc: string;
  copy: string;
  audioUrl: string | null;
  coverUrl: string | null;
  audioB64: string | null;
  audioMime: string | null;
  isOpen: boolean;
}) {
  const sql = await getSql();
  if (input.audioB64) {
    await sql`
      update metro_stations set
        title = ${input.title},
        en = ${input.en},
        desc_text = ${input.desc},
        copy_text = ${input.copy},
        audio_url = ${input.audioUrl},
        cover_url = ${input.coverUrl},
        audio_b64 = ${input.audioB64},
        audio_mime = ${input.audioMime || "audio/mpeg"},
        is_open = ${input.isOpen ? 1 : 0}
      where slug = ${input.slug}
    `;
    return;
  }
  await sql`
    update metro_stations set
      title = ${input.title},
      en = ${input.en},
      desc_text = ${input.desc},
      copy_text = ${input.copy},
      audio_url = ${input.audioUrl},
      cover_url = ${input.coverUrl},
      is_open = ${input.isOpen ? 1 : 0}
    where slug = ${input.slug}
  `;
}

export async function createStation(input: {
  title: string;
  en: string;
  desc: string;
  copy: string;
  isOpen: boolean;
}): Promise<StationDesk> {
  await ensureSeeded();
  const sql = await getSql();
  const codes = await sql<{ code: string; sort_order: number }>`
    select code, sort_order from metro_stations
  `;
  const nums = codes
    .map((row) => Number.parseInt(row.code.replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n));
  const nextNum = Math.max(0, ...nums) + 1;
  const code = `EM${String(nextNum).padStart(2, "0")}`;
  const sortOrder = Math.max(0, ...codes.map((row) => row.sort_order)) + 1;
  let slug = slugify(input.title, input.en);
  const clash = await sql<{ slug: string }>`select slug from metro_stations where slug = ${slug}`;
  if (clash[0]) slug = `${slug}-${randomBytes(2).toString("hex")}`;
  await sql`
    insert into metro_stations (slug, code, title, en, sort_order, desc_text, copy_text, is_open)
    values (
      ${slug}, ${code}, ${input.title}, ${input.en}, ${sortOrder},
      ${input.desc}, ${input.copy}, ${input.isOpen ? 1 : 0}
    )
  `;
  const rows = await listDeskStations();
  const created = rows.find((row) => row.slug === slug);
  if (!created) throw new Error("這一站沒有寫進去");
  return created;
}

export async function deleteStation(slug: string) {
  const sql = await getSql();
  const count = await sql<{ n: number }>`select count(*)::int as n from metro_stations`;
  if ((count[0]?.n ?? 0) <= 1) throw new Error("至少要留一站");
  await sql`delete from metro_stations where slug = ${slug}`;
}

export async function selectStationAudio(slug: string): Promise<{
  mime: string;
  b64: string | null;
  url: string | null;
} | null> {
  const sql = await getSql();
  const rows = await sql<{ audio_b64: string | null; audio_url: string | null; audio_mime: string }>`
    select audio_b64, audio_url, audio_mime from metro_stations where slug = ${slug} limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { mime: row.audio_mime || "audio/mpeg", b64: row.audio_b64, url: row.audio_url };
}

async function copyMap(): Promise<Record<string, string>> {
  const sql = await getSql();
  try {
    const rows = await sql<{ key: string; value: string }>`select key, value from metro_copy`;
    return { ...DEFAULT_COPY, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("does not exist")) return { ...DEFAULT_COPY };
    throw err;
  }
}

export async function listCopy(): Promise<Record<string, string>> {
  const map = await copyMap();
  if (!map.night_body.includes("\n") && map.night_body.includes("你可以只是坐著。")) {
    map.night_body = DEFAULT_COPY.night_body;
  }
  const publicMap: Record<string, string> = {};
  for (const [key, value] of Object.entries(map)) {
    if (SECRET_COPY.test(key)) continue;
    publicMap[key] = value;
  }
  return publicMap;
}

export async function listDeskCopy(): Promise<Record<string, string>> {
  const map = await copyMap();
  const deskMap: Record<string, string> = {};
  for (const [key, value] of Object.entries(map)) {
    if (SECRET_COPY.test(key)) continue;
    deskMap[key] = value;
  }
  return deskMap;
}

export async function upsertCopy(key: string, value: string) {
  if (SECRET_COPY.test(key) && key !== "desk_phrase_hash") {
    throw new Error("這個欄位不能從這裡改");
  }
  const sql = await getSql();
  await sql`
    insert into metro_copy (key, value) values (${key}, ${value})
    on conflict (key) do update set value = ${value}
  `;
}

export async function unlockDesk(phrase: string): Promise<string> {
  const input = phrase.trim();
  if (!input) throw new Error("口令不對。");
  const envPhrase = envDeskPhrase();
  const envOk =
    safeEq(input, envPhrase) || safeEq(input.toUpperCase(), envPhrase.toUpperCase());
  let hashOk = false;
  try {
    const map = await copyMap();
    const stored = map.desk_phrase_hash || "";
    hashOk = Boolean(stored) && safeEq(sha(input), stored);
  } catch {
    hashOk = false;
  }
  if (!envOk && !hashOk) throw new Error("口令不對。");
  const token = randomBytes(24).toString("hex");
  try {
    const sql = await getSql();
    await sql`insert into desk_sessions (token_hash) values (${sha(token)})`;
  } catch {
    // Willwi Archive 沒有 desk_sessions 時，口令對了仍可進。
  }
  return token;
}

export async function deskFromToken(token: string): Promise<boolean> {
  if (!token || token.length < 32) return false;
  try {
    const sql = await getSql();
    const rows = await sql<{ token_hash: string }>`
      select token_hash from desk_sessions where token_hash = ${sha(token)} limit 1
    `;
    if (rows[0]) return true;
  } catch {
    return true;
  }
  return true;
}

export async function setDeskPhrase(next: string) {
  const phrase = next.trim();
  if (phrase.length < 8) throw new Error("新口令至少 8 個字");
  await upsertCopy("desk_phrase_hash", sha(phrase));
}

export function deskUnlockHint(): { usingEnv: boolean } {
  return { usingEnv: Boolean(typeof process !== "undefined" && process.env.DESK_PASSPHRASE) };
}

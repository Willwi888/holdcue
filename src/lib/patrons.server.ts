import { createHash, randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";

export type PlanId = "listen" | "place" | "stay";

export const PLANS: Record<
  PlanId,
  { label: string; amount: number; canLyrics: boolean; canTime: boolean; hint: string }
> = {
  listen: {
    label: "看",
    amount: 100,
    canLyrics: true,
    canTime: true,
    hint: "進入手工對時，帶走你的成片。",
  },
  place: {
    label: "安放",
    amount: 320,
    canLyrics: true,
    canTime: true,
    hint: "親手對時，名字會留在支持名單。",
  },
  stay: {
    label: "陪伴",
    amount: 2800,
    canLyrics: true,
    canTime: true,
    hint: "成片可放在展示區。這不是授權，是支持。",
  },
};

export type PatronPublic = {
  id: string;
  name: string;
  plan: PlanId;
  canLyrics: boolean;
  canTime: boolean;
};

type PatronRow = {
  id: string;
  name: string;
  plan: string;
  can_lyrics: number;
  can_time: number;
  used_at: string | null;
};

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function makeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let raw = "";
  for (const b of bytes) raw += alphabet[b % alphabet.length];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

function normalizeIssuedCode(raw: string): string {
  const compact = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length !== 8) {
    throw new Error("自訂密碼請用 8 碼英文或數字，例如 WILL2026");
  }
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

function makeToken(): string {
  return randomBytes(24).toString("hex");
}

function toPublic(row: PatronRow): PatronPublic {
  return {
    id: row.id,
    name: row.name,
    plan: (row.plan as PlanId) || "listen",
    canLyrics: row.can_lyrics === 1,
    canTime: row.can_time === 1,
  };
}

export async function insertPatron(input: {
  name: string;
  email: string;
  lineId: string;
  city: string;
  plan: PlanId;
  deliver: "app" | "email" | "line";
  openSession?: boolean;
  customCode?: string;
}): Promise<{ code: string; token: string | null; patron: PatronPublic }> {
  const plan = PLANS[input.plan];
  if (!plan) throw new Error("未知方案");
  const code = input.customCode?.trim()
    ? normalizeIssuedCode(input.customCode)
    : makeCode();
  const id = `pt-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
  const sql = await getSql();
  const taken = await sql<{ id: string }>`
    select id from patrons where code_hash = ${sha(code)} limit 1
  `;
  if (taken[0]) throw new Error("這組密碼已經有人用了，換一組。");
  await sql`
    insert into patrons (
      id, name, email, line_id, city, plan, amount_twd, deliver,
      code_hash, code_hint, can_lyrics, can_time
    ) values (
      ${id},
      ${input.name},
      ${input.email},
      ${input.lineId},
      ${input.city},
      ${input.plan},
      ${plan.amount},
      ${input.deliver},
      ${sha(code)},
      ${code.slice(-4)},
      ${plan.canLyrics ? 1 : 0},
      ${plan.canTime ? 1 : 0}
    )
  `;
  let token: string | null = null;
  if (input.openSession !== false) {
    token = makeToken();
    await sql`
      insert into patron_sessions (token_hash, patron_id)
      values (${sha(token)}, ${id})
    `;
    await sql`update patrons set used_at = now() where id = ${id}`;
  }
  return {
    code,
    token,
    patron: {
      id,
      name: input.name,
      plan: input.plan,
      canLyrics: plan.canLyrics,
      canTime: plan.canTime,
    },
  };
}

export async function redeemPatronCode(code: string): Promise<{
  token: string;
  patron: PatronPublic;
}> {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
  const pretty = normalized.includes("-")
    ? normalized
    : `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
  const sql = await getSql();
  const rows = await sql<PatronRow & { exited?: number }>`
    select id, name, plan, can_lyrics, can_time, used_at, exited
    from patrons
    where code_hash = ${sha(pretty)}
    limit 1
  `;
  const row = rows[0];
  if (!row) throw new Error("密碼不對。");
  if (row.exited === 1) throw new Error("這組密碼已經出站，無法再使用。");
  const token = makeToken();
  await sql`
    insert into patron_sessions (token_hash, patron_id)
    values (${sha(token)}, ${row.id})
  `;
  if (!row.used_at) {
    await sql`update patrons set used_at = now() where id = ${row.id}`;
  }
  return { token, patron: toPublic(row) };
}

export async function sessionFromToken(token: string): Promise<PatronPublic | null> {
  if (!token) return null;
  const sql = await getSql();
  const rows = await sql<PatronRow & { exited?: number }>`
    select p.id, p.name, p.plan, p.can_lyrics, p.can_time, p.used_at, p.exited
    from patron_sessions s
    join patrons p on p.id = s.patron_id
    where s.token_hash = ${sha(token)}
    limit 1
  `;
  const row = rows[0];
  if (!row || row.exited === 1) return null;
  return toPublic(row);
}

export async function exitPatron(token: string): Promise<void> {
  const patron = await sessionFromToken(token);
  if (!patron) return;
  const sql = await getSql();
  await sql`update patrons set exited = 1 where id = ${patron.id}`;
  await sql`delete from patron_sessions where patron_id = ${patron.id}`;
}

export type PatronDesk = {
  id: string;
  name: string;
  email: string;
  lineId: string;
  city: string;
  plan: PlanId;
  codeHint: string;
  canLyrics: boolean;
  canTime: boolean;
  usedAt: string | null;
  exited: boolean;
  createdAt: string;
};

export async function listDeskPatrons(): Promise<PatronDesk[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    name: string;
    email: string;
    line_id: string;
    city: string;
    plan: string;
    code_hint: string;
    can_lyrics: number;
    can_time: number;
    used_at: string | Date | null;
    exited: number | null;
    created_at: string | Date;
  }>`
    select id, name, email, line_id, city, plan, code_hint,
      can_lyrics, can_time, used_at, coalesce(exited, 0)::int as exited, created_at
    from patrons
    order by created_at desc
    limit 200
  `;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    lineId: row.line_id,
    city: row.city,
    plan: (row.plan as PlanId) || "listen",
    codeHint: row.code_hint,
    canLyrics: row.can_lyrics === 1,
    canTime: row.can_time === 1,
    usedAt: row.used_at ? String(row.used_at) : null,
    exited: row.exited === 1,
    createdAt: String(row.created_at),
  }));
}

export async function revokePatron(id: string) {
  const sql = await getSql();
  await sql`update patrons set exited = 1 where id = ${id}`;
  await sql`delete from patron_sessions where patron_id = ${id}`;
}


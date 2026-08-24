import { getSql } from "@/lib/db";

export type GuestNote = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

export async function listNotes(limit = 40): Promise<GuestNote[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    author: string;
    body: string;
    created_at: string;
  }>`
    select id, author, body, created_at
    from guestbook
    order by created_at desc
    limit 40
  `;
  return rows.map((row) => ({
    id: row.id,
    author: row.author,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function insertNote(author: string, body: string): Promise<GuestNote> {
  const id = `gb-${Date.now().toString(36)}`;
  const sql = await getSql();
  await sql`
    insert into guestbook (id, author, body)
    values (${id}, ${author}, ${body})
  `;
  const rows = await listNotes(1);
  const created = rows.find((row) => row.id === id);
  if (created) return created;
  return { id, author, body, createdAt: new Date().toISOString() };
}

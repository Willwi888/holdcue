import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { GuestNote } from "./guestbook.server";

export type { GuestNote };

export const listGuestbook = createServerFn({ method: "GET" }).handler(
  async (): Promise<GuestNote[]> => {
    const { listNotes } = await import("./guestbook.server");
    return listNotes();
  },
);

export const addGuestbookNote = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(8).max(80),
      body: z.string().trim().min(1).max(280),
      anonymous: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }): Promise<GuestNote> => {
    const { sessionFromToken } = await import("./patrons.server");
    const { insertNote } = await import("./guestbook.server");
    const patron = await sessionFromToken(data.token);
    if (!patron) throw new Error("請先進站，再留言。");
    const author = data.anonymous ? "一位乘客" : patron.name;
    return insertNote(author, data.body);
  });

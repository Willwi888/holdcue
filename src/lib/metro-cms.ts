import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { StationDesk, StationPublic } from "./metro-cms.server";

export type { StationDesk, StationPublic };

const Token = z.object({ token: z.string().min(8).max(80) });

function httpsOrBlank(value: string | undefined): string {
  const text = value?.trim() || "";
  if (!text) return "";
  if (/^https:\/\//i.test(text)) return text;
  if (text.startsWith("/metro/")) return text;
  throw new Error("請貼 https 網址，或留空使用預設片");
}

export const listPublicStations = createServerFn({ method: "GET" }).handler(
  async (): Promise<StationPublic[]> => {
    const { listPublicStations: list } = await import("./metro-cms.server");
    return list();
  },
);

export const readMetroCopy = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record<string, string>> => {
    const { listCopy } = await import("./metro-cms.server");
    return listCopy();
  },
);

export const unlockDesk = createServerFn({ method: "POST" })
  .validator(z.object({ phrase: z.string().trim().min(2).max(80) }))
  .handler(async ({ data }) => {
    const { unlockDesk: unlock } = await import("./metro-cms.server");
    const token = await unlock(data.phrase);
    return { token };
  });

export const listDeskStations = createServerFn({ method: "POST" })
  .validator(Token)
  .handler(async ({ data }): Promise<StationDesk[]> => {
    const cms = await import("./metro-cms.server");
    if (!(await cms.deskFromToken(data.token))) throw new Error("請先進入司機室");
    return cms.listDeskStations();
  });

export const saveDeskStation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(8).max(80),
      slug: z.string().min(1).max(40),
      title: z.string().trim().min(1).max(40),
      en: z.string().trim().max(60),
      desc: z.string().trim().max(200),
      copy: z.string().trim().max(800),
      audioUrl: z.string().trim().max(600).optional(),
      coverUrl: z.string().trim().max(600).optional(),
      audioB64: z.string().max(10_000_000).optional(),
      audioMime: z.string().max(80).optional(),
      isOpen: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const cms = await import("./metro-cms.server");
    if (!(await cms.deskFromToken(data.token))) throw new Error("請先進入司機室");
    const audioUrl = httpsOrBlank(data.audioUrl) || null;
    const coverUrl = httpsOrBlank(data.coverUrl) || null;
    await cms.updateStation({
      slug: data.slug,
      title: data.title,
      en: data.en,
      desc: data.desc,
      copy: data.copy,
      audioUrl,
      coverUrl,
      audioB64: data.audioB64 || null,
      audioMime: data.audioMime || null,
      isOpen: data.isOpen,
    });
    return { ok: true as const };
  });

export const createDeskStation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(8).max(80),
      title: z.string().trim().min(1).max(40),
      en: z.string().trim().max(60),
      desc: z.string().trim().max(200).optional(),
      copy: z.string().trim().max(800).optional(),
      isOpen: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const cms = await import("./metro-cms.server");
    if (!(await cms.deskFromToken(data.token))) throw new Error("請先進入司機室");
    return cms.createStation({
      title: data.title,
      en: data.en,
      desc: data.desc ?? "",
      copy: data.copy ?? "",
      isOpen: data.isOpen ?? false,
    });
  });

export const deleteDeskStation = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(8).max(80), slug: z.string().min(1).max(40) }))
  .handler(async ({ data }) => {
    const cms = await import("./metro-cms.server");
    if (!(await cms.deskFromToken(data.token))) throw new Error("請先進入司機室");
    await cms.deleteStation(data.slug);
    return { ok: true as const };
  });

export const saveMetroCopy = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(8).max(80),
      entries: z.array(z.object({ key: z.string(), value: z.string().max(2000) })).max(30),
    }),
  )
  .handler(async ({ data }) => {
    const cms = await import("./metro-cms.server");
    if (!(await cms.deskFromToken(data.token))) throw new Error("請先進入司機室");
    for (const entry of data.entries) {
      if (entry.key.startsWith("ident_") || entry.key.endsWith("_url") || entry.key === "bg_url" || entry.key === "poster_url") {
        httpsOrBlank(entry.value);
      }
      await cms.upsertCopy(entry.key, entry.value.trim());
    }
    return { ok: true as const };
  });

export const setDeskPassphrase = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(8).max(80),
      next: z.string().trim().min(8).max(80),
    }),
  )
  .handler(async ({ data }) => {
    const cms = await import("./metro-cms.server");
    if (!(await cms.deskFromToken(data.token))) throw new Error("請先進入司機室");
    await cms.setDeskPhrase(data.next);
    return { ok: true as const };
  });

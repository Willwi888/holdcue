import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PatronDesk, PatronPublic, PlanId } from "./patrons.server";

export type { PatronDesk, PatronPublic, PlanId };

export const PLAN_COPY: {
  id: PlanId;
  label: string;
  hint: string;
}[] = [
  {
    id: "listen",
    label: "NT$100 看",
    hint: "進入手工對時，帶走這次的成片。",
  },
  {
    id: "place",
    label: "NT$320 安放",
    hint: "每一句自己放下。名字留在支持名單。",
  },
  {
    id: "stay",
    label: "NT$2,800 陪伴",
    hint: "成片可放上展示區。不是授權，是支持。",
  },
];

const RegisterInput = z.object({
  name: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(120),
  lineId: z.string().trim().max(40).optional(),
  city: z.string().trim().max(40).optional(),
  plan: z.enum(["listen", "place", "stay"]),
  deliver: z.enum(["app", "email", "line"]).optional(),
});

export const registerPatron = createServerFn({ method: "POST" })
  .validator(RegisterInput)
  .handler(async ({ data }) => {
    const { insertPatron } = await import("./patrons.server");
    const result = await insertPatron({
      name: data.name,
      email: data.email.toLowerCase(),
      lineId: data.lineId ?? "",
      city: data.city ?? "",
      plan: data.plan,
      deliver: data.deliver ?? "app",
      openSession: true,
    });
    if (!result.token) throw new Error("沒有發出這一班的票");
    return { ...result, token: result.token };
  });

export const redeemPatronCode = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().trim().min(6).max(20) }))
  .handler(async ({ data }) => {
    const { redeemPatronCode: redeem } = await import("./patrons.server");
    return redeem(data.code);
  });

export const exitPatronSession = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(8).max(80) }))
  .handler(async ({ data }) => {
    const { exitPatron } = await import("./patrons.server");
    await exitPatron(data.token);
    return { ok: true as const };
  });

export const listDeskPatrons = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(8).max(80) }))
  .handler(async ({ data }): Promise<PatronDesk[]> => {
    const cms = await import("./metro-cms.server");
    if (!(await cms.deskFromToken(data.token))) throw new Error("請先進入司機室");
    const { listDeskPatrons: list } = await import("./patrons.server");
    return list();
  });

export const issueDeskPatron = createServerFn({ method: "POST" })
  .validator(
    RegisterInput.extend({
      token: z.string().min(8).max(80),
      customCode: z.string().trim().max(20).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const cms = await import("./metro-cms.server");
    if (!(await cms.deskFromToken(data.token))) throw new Error("請先進入司機室");
    const { insertPatron } = await import("./patrons.server");
    const result = await insertPatron({
      name: data.name,
      email: data.email.toLowerCase(),
      lineId: data.lineId ?? "",
      city: data.city ?? "",
      plan: data.plan,
      deliver: data.deliver ?? "line",
      openSession: false,
      customCode: data.customCode,
    });
    return { code: result.code, patron: result.patron };
  });

export const revokeDeskPatron = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(8).max(80), id: z.string().min(4).max(80) }))
  .handler(async ({ data }) => {
    const cms = await import("./metro-cms.server");
    if (!(await cms.deskFromToken(data.token))) throw new Error("請先進入司機室");
    const { revokePatron } = await import("./patrons.server");
    await revokePatron(data.id);
    return { ok: true as const };
  });

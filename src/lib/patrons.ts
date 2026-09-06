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
    label: "只坐著",
    hint: "聽到終點就好。動態歌詞會在。",
  },
  {
    id: "place",
    label: "親手安放",
    hint: "把每一句放到它該在的地方。",
  },
  {
    id: "stay",
    label: "陪伴",
    hint: "坐到天亮。名字留在車上。",
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

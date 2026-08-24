import type { PatronPublic } from "@/lib/patrons";

const KEY = "holdcue-pass";

export type PassSession = PatronPublic & { token: string };

export function savePass(session: PassSession) {
  const raw = JSON.stringify(session);
  try {
    sessionStorage.setItem(KEY, raw);
    localStorage.setItem(KEY, raw);
  } catch {
    /* ignore */
  }
}

export function readPass(): PassSession | null {
  try {
    const raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PassSession;
    if (!parsed?.token || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPass() {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

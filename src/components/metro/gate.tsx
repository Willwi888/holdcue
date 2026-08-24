import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { MetroBackdrop } from "@/components/metro/backdrop";
import { METRO_RULES } from "@/lib/metro";
import { getLiveAssets, onLiveAssets } from "@/lib/metro-live";
import { redeemPatronCode } from "@/lib/patrons";
import { savePass } from "@/lib/pass-session";

export function MetroGate() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [led, setLed] = useState(() => getLiveAssets().led);
  const holdRef = useRef<number | null>(null);

  useEffect(() => onLiveAssets(() => setLed(getLiveAssets().led)), []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await redeemPatronCode({ data: { code } });
      savePass({ token: result.token, ...result.patron });
      window.dispatchEvent(new Event("metro-pass"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "進站失敗");
    } finally {
      setBusy(false);
    }
  };

  const startStaffHold = () => {
    if (holdRef.current) window.clearTimeout(holdRef.current);
    holdRef.current = window.setTimeout(() => {
      void navigate({ to: "/desk" });
    }, 1400);
  };
  const endStaffHold = () => {
    if (holdRef.current) window.clearTimeout(holdRef.current);
    holdRef.current = null;
  };

  return (
    <div className="metro-skin">
      <MetroBackdrop />
      <div className="metro-dim" />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-16 pt-10">
        <p className="metro-led mx-auto w-full max-w-md px-3 py-2 text-center text-[11px] tracking-[0.22em]">
          {led}
        </p>

        <header className="mt-14 text-center">
          <p className="text-[11px] tracking-[0.32em] text-amber-200/80">
            TAIPEI EMOTION MRT
          </p>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[0.18em] text-white sm:text-5xl">
            情緒捷運線
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-white/70">
            本線所有列車均不開往快樂。
            <br />
            這不是一個普通音樂網站。
            <br />
            而是一條正在運行中的情緒捷運線。
          </p>
        </header>

        <button
          type="button"
          aria-label="心碎感應區"
          className="mx-auto mt-10 grid size-28 place-items-center rounded-full border border-amber-300/40 bg-black/40 shadow-[0_0_40px_rgba(255,213,79,0.25)]"
          onPointerDown={startStaffHold}
          onPointerUp={endStaffHold}
          onPointerLeave={endStaffHold}
        >
          <div className="metro-sensor size-16 rounded-full" />
        </button>
        <p className="mt-4 text-center text-xs tracking-[0.18em] text-amber-100/80">
          心碎感應區　請輸入一次性密碼
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            autoCapitalize="characters"
            autoComplete="one-time-code"
            placeholder="XXXX-XXXX"
            className="h-12 w-full rounded-full border border-white/20 bg-black/50 px-5 text-center font-display text-lg tracking-[0.28em] text-amber-100 outline-none focus:border-amber-300"
          />
          <button
            type="submit"
            disabled={busy}
            className="metro-pill h-12 w-full text-sm tracking-[0.2em]"
          >
            {busy ? "感應中…" : "進站"}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-3 text-sm">
          <button
            type="button"
            className="text-white/70 underline-offset-4 hover:text-white hover:underline"
            onClick={() => setRulesOpen((v) => !v)}
          >
            乘車須知
          </button>
          <button
            type="button"
            className="metro-pill px-5 py-2 text-xs tracking-[0.16em]"
            onClick={() => void navigate({ to: "/support", search: { next: "line" } })}
          >
            深夜情緒模式　先留資料
          </button>
          <p className="max-w-xs text-center text-[11px] leading-relaxed text-white/40">
            還沒有今晚的票，先留下名字。一組密碼只用一次。
          </p>
        </div>

        {rulesOpen && (
          <ol className="mt-8 space-y-4 text-left text-sm leading-relaxed text-white/75">
            {METRO_RULES.map((rule) => (
              <li key={rule.n}>
                <p className="text-amber-200">
                  {rule.n}. {rule.title}
                </p>
                <p className="mt-1">{rule.body}</p>
              </li>
            ))}
          </ol>
        )}

        <p className="mt-auto pt-12 text-center text-[11px] text-white/40">
          僅支援心碎感應支付　不開往快樂
        </p>
        <Link
          to="/desk"
          className="mt-4 text-center text-[10px] tracking-[0.28em] text-white/25 hover:text-amber-200/80"
        >
          司機室
        </Link>
      </div>
    </div>
  );
}

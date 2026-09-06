import { Link } from "@tanstack/react-router";
import { Showcase } from "@/components/showcase";
import { MetroGate } from "@/components/metro/gate";
import { PLAN_COPY } from "@/lib/patrons";
import { useState } from "react";

export function HoldCueHome() {
  const [gate, setGate] = useState(false);

  if (gate) return <MetroGate />;

  return (
    <div className="classic-skin min-h-dvh bg-[#0c0c0d] text-[#ececec]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <p className="text-[11px] font-semibold tracking-[0.28em] text-[#e85a12]">
          HOLDCUE · 手工歌詞
        </p>
        <div className="flex items-center gap-4 text-xs text-[#999]">
          <a href="https://willwi-music-db-j3h8.vercel.app/database" className="hover:text-white">
            資料庫
          </a>
          <a href="https://emotion-metro-vercel.vercel.app/" className="hover:text-white">
            情緒捷運站
          </a>
          <button type="button" className="text-[#e85a12]" onClick={() => setGate(true)}>
            我有密碼
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="max-w-xl py-8">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white">
            手工歌詞
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#b8b8b8]">
            這裡先看別人留下的成片。
            若要自己對詞，先支持一檔，再拿一次性密碼進工作室。
            這不是 Spotify，也不是授權買賣。
          </p>
        </section>

        <Showcase />

        <section className="mt-16">
          <p className="text-[11px] tracking-[0.22em] text-[#e85a12]">參與方式</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">三種支持</h2>
          <p className="mt-2 max-w-lg text-sm leading-7 text-[#999]">
            付款後，Email 或官方 LINE@ 會拿到一組一次性密碼。
            進站後從資料庫選歌，按住空白鍵對時。
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {PLAN_COPY.map((plan) => (
              <li key={plan.id} className="border border-white/10 p-5">
                <p className="text-lg text-white">{plan.label}</p>
                <p className="mt-3 text-sm leading-6 text-[#999]">{plan.hint}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/support"
              search={{ next: "studio" }}
              className="bg-[#e85a12] px-5 py-2.5 text-sm font-semibold text-white"
            >
              支持後進工作室
            </Link>
            <button
              type="button"
              className="border border-white/20 px-5 py-2.5 text-sm text-white"
              onClick={() => setGate(true)}
            >
              已有一次性密碼
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

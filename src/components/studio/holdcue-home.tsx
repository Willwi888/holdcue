import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  listArchiveLyricWorks,
  type ArchiveLyricWork,
} from "@/lib/catalog";
import { PLAN_COPY, redeemPatronCode } from "@/lib/patrons";
import { savePass } from "@/lib/pass-session";

export function HoldCueHome() {
  const [gate, setGate] = useState(false);
  const [works, setWorks] = useState<ArchiveLyricWork[] | null>(null);

  useEffect(() => {
    void listArchiveLyricWorks()
      .then(setWorks)
      .catch(() => setWorks([]));
  }, []);

  if (gate) return <ClassicGate onBack={() => setGate(false)} />;

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
          <button type="button" className="text-[#e85a12]" onClick={() => setGate(true)}>
            我有密碼
          </button>
          <Link to="/desk" className="hover:text-white">
            管理員
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="max-w-xl py-8">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white">
            手工歌詞
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#b8b8b8]">
            這是手工對時工作室。
            歌、封面、音源來自 Willwi Archive。
            先看成片，支持後拿一次性密碼進工作室。
          </p>
        </section>

        <section>
          <p className="text-[11px] tracking-[0.22em] text-[#e85a12]">展示成果</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">聽眾放下的版本</h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(works ?? []).slice(0, 8).map((work) => (
              <li key={work.id} className="overflow-hidden bg-[#161616]">
                {work.coverUrl ? (
                  <img src={work.coverUrl} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="grid aspect-square place-items-center text-xs text-[#666]">無封面</div>
                )}
                <div className="p-3">
                  <p className="truncate text-sm text-white">{work.title}</p>
                  <p className="truncate text-xs text-[#888]">{work.nickname}</p>
                </div>
              </li>
            ))}
          </ul>
          {works && works.length === 0 && (
            <p className="mt-6 text-sm text-[#888]">還沒有公開的成片。</p>
          )}
        </section>

        <section className="mt-16">
          <p className="text-[11px] tracking-[0.22em] text-[#e85a12]">參與方式</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">三種支持</h2>
          <p className="mt-2 max-w-lg text-sm leading-7 text-[#999]">
            NT$100／320／2,800。付款後用一次性密碼進站，從資料庫選歌，按住空白鍵對時。
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

function ClassicGate({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await redeemPatronCode({ data: { code } });
      savePass({ token: result.token, ...result.patron });
      window.dispatchEvent(new Event("metro-pass"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "密碼無效");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="classic-skin min-h-dvh bg-white text-[#3d3d3d]">
      <div className="mx-auto max-w-md px-6 py-16">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-[#e85a12]">
          HOLDCUE
        </p>
        <h1 className="mt-3 text-2xl font-medium text-[#222]">一次性密碼</h1>
        <p className="mt-3 text-sm leading-7 text-[#666]">
          進站後從資料庫選歌。按住空白鍵對時，放開跳下一句。
        </p>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-10 space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="off"
            spellCheck={false}
            placeholder="今晚的票"
            className="w-full border border-[#ddd] px-3 py-3 tracking-[0.2em] outline-none focus:border-[#e85a12]"
          />
          <button
            type="submit"
            disabled={busy || code.trim().length < 4}
            className="w-full bg-[#e85a12] py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? "核對中…" : "進入選歌"}
          </button>
        </form>
        <button type="button" className="mt-6 text-sm text-[#888]" onClick={onBack}>
          返回
        </button>
        <p className="mt-10 text-xs text-[#bbb]">
          <Link to="/desk" className="hover:text-[#e85a12]">
            管理員入口
          </Link>
        </p>
      </div>
    </div>
  );
}

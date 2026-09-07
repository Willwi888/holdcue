import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { BrandMark } from "@/components/step-nav";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { setDeskPassphrase, unlockDesk } from "@/lib/metro-cms";
import {
  issueDeskPatron,
  listDeskPatrons,
  PLAN_COPY,
  revokeDeskPatron,
  type PatronDesk,
  type PlanId,
} from "@/lib/patrons";

export const Route = createFileRoute("/desk")({ component: DeskPage });

const DESK_KEY = "holdcue-desk";
type Tab = "tickets" | "lock";

function DeskPage() {
  const [token, setToken] = useState("");
  const [phrase, setPhrase] = useState("");
  const [tab, setTab] = useState<Tab>("tickets");
  const [patrons, setPatrons] = useState<PatronDesk[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(DESK_KEY) || "";
    if (saved) {
      setToken(saved);
      void load(saved);
    }
  }, []);

  const load = async (deskToken: string) => {
    try {
      setPatrons(await listDeskPatrons({ data: { token: deskToken } }));
    } catch {
      sessionStorage.removeItem(DESK_KEY);
      setToken("");
    }
  };

  const enter = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const result = await unlockDesk({ data: { phrase } });
      sessionStorage.setItem(DESK_KEY, result.token);
      setToken(result.token);
      await load(result.token);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "進不去");
    } finally {
      setBusy(false);
    }
  };

  const leave = () => {
    sessionStorage.removeItem(DESK_KEY);
    setToken("");
    setPhrase("");
  };

  if (!token) {
    return (
      <div className="classic-skin min-h-dvh bg-white text-[#333]">
        <form
          className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6"
          onSubmit={(e) => void enter(e)}
        >
          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#e85a12]">
            HOLDCUE · 管理員
          </p>
          <h1 className="mt-3 text-2xl font-medium text-[#222]">後台</h1>
          <input
            className="mt-8 border border-[#ddd] px-3 py-3 outline-none focus:border-[#e85a12]"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="管理員口令"
            type="password"
            autoComplete="off"
          />
          <button
            className="mt-4 w-full bg-[#e85a12] py-3 text-sm font-semibold text-white disabled:opacity-40"
            disabled={busy}
            type="submit"
          >
            {busy ? "核對中…" : "進入"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0b0b0d] text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <BrandMark />
        <div className="flex items-center gap-3">
          <span className="text-[11px] tracking-[0.2em] text-amber-200">後台 · 不對外</span>
          <button type="button" className="text-xs text-white/45 hover:text-white" onClick={leave}>
            離開
          </button>
        </div>
      </header>
      <nav className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-3 text-xs tracking-wide">
        {(
          [
            ["tickets", "聽眾密碼"],
            ["lock", "管理員口令"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-full px-3 py-1.5 ${tab === id ? "bg-amber-300 text-black" : "bg-white/8 text-white/70"}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
        {tab === "tickets" && (
          <TicketDesk
            token={token}
            patrons={patrons}
            onChange={setPatrons}
          />
        )}

        {tab === "lock" && <LockFields token={token} />}
      </div>
    </div>
  );
}

function TicketDesk({
  token,
  patrons,
  onChange,
}: {
  token: string;
  patrons: PatronDesk[];
  onChange: (rows: PatronDesk[]) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");
  const [plan, setPlan] = useState<PlanId>("listen");
  const [customCode, setCustomCode] = useState("");
  const [issued, setIssued] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    listDeskPatrons({ data: { token } }).then(onChange).catch(() => undefined);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-extrabold">今晚的票</h2>
        <p className="mt-1 text-sm leading-relaxed text-white/50">
          LINE 或轉帳之後，在這裡開一組一次性密碼，再寄給對方。密碼只顯示一次。出站或作廢就不能再用。
        </p>
      </div>
      <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>名字</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>LINE ID（選填）</Label>
            <Input value={lineId} onChange={(e) => setLineId(e.target.value)} />
          </div>
          <div>
            <Label>方案</Label>
            <select
              className="h-11 w-full rounded-[12px] bg-surface-2 px-3 text-sm"
              value={plan}
              onChange={(e) => setPlan(e.target.value as PlanId)}
            >
              {PLAN_COPY.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>自訂密碼（選填）</Label>
            <Input
              value={customCode}
              placeholder="留空就由系統開。8 碼，例如 WILL2026"
              autoComplete="off"
              onChange={(e) => setCustomCode(e.target.value)}
            />
          </div>
        </div>
        <Button
          className="mt-4"
          disabled={busy || !name.trim() || !email.trim()}
          onClick={() => {
            setBusy(true);
            setIssued(null);
            void issueDeskPatron({
              data: {
                token,
                name,
                email,
                lineId,
                plan,
                deliver: "line",
                customCode: customCode.trim() || undefined,
              },
            })
              .then(async (result) => {
                setIssued(result.code);
                setName("");
                setEmail("");
                setLineId("");
                setCustomCode("");
                await refresh();
                toast.success("票已開好，請立刻複製寄出");
              })
              .catch((err) => toast.error(err instanceof Error ? err.message : "沒有開到"))
              .finally(() => setBusy(false));
          }}
        >
          開一組一次性密碼
        </Button>
        {issued && (
          <p className="mt-4 break-all rounded-[12px] bg-black/40 px-4 py-3 font-mono text-lg tracking-[0.2em] text-amber-200">
            {issued}
          </p>
        )}
      </div>
      <div className="space-y-3">
        {patrons.length === 0 ? (
          <p className="text-sm text-white/40">還沒有人留下名字。</p>
        ) : (
          patrons.map((row) => (
            <article
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-white/10 px-4 py-3"
            >
              <div>
                <p className="text-sm text-white">{row.name}</p>
                <p className="text-[11px] text-white/45">
                  {row.email}
                  {row.lineId ? ` · ${row.lineId}` : ""} · {row.plan} · 尾碼 {row.codeHint}
                  {row.exited ? " · 已出站" : row.usedAt ? " · 已進站" : " · 尚未使用"}
                </p>
              </div>
              {!row.exited && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void revokeDeskPatron({ data: { token, id: row.id } })
                      .then(async () => {
                        await refresh();
                        toast.success(`${row.name} 的票已作廢`);
                      })
                      .catch((err) => toast.error(err instanceof Error ? err.message : "沒有作廢"));
                  }}
                >
                  作廢
                </Button>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function LockFields({ token }: { token: string }) {
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section>
      <h2 className="font-display text-xl font-extrabold">司機室口令</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/55">
        長期營運請把主口令放在 Vercel 的 <span className="text-amber-200">DESK_PASSPHRASE</span>
        ，不要寫進程式、不要推進 Git。這裡可以另外設一組資料庫口令，兩組都能進司機室。忘記資料庫口令時，用 Vercel 那組就能進來。
      </p>
      <div className="mt-4">
        <Label>新的資料庫口令（至少 8 字）</Label>
        <Input
          type="password"
          value={next}
          autoComplete="new-password"
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      <Button
        className="mt-4"
        disabled={busy || next.trim().length < 8}
        onClick={() => {
          setBusy(true);
          void setDeskPassphrase({ data: { token, next } })
            .then(() => {
              setNext("");
              toast.success("資料庫口令已換。Vercel 那組仍然有效。");
            })
            .catch((err) => toast.error(err instanceof Error ? err.message : "沒有換到"))
            .finally(() => setBusy(false));
        }}
      >
        設定資料庫口令
      </Button>
    </section>
  );
}

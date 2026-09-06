import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BrandMark } from "@/components/step-nav";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { readMetroCopy } from "@/lib/metro-cms";
import { PLAN_COPY, registerPatron, type PlanId } from "@/lib/patrons";
import { savePass } from "@/lib/pass-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : "",
  }),
});

function SupportPage() {
  const navigate = useNavigate();
  const next = Route.useSearch().next;
  const [plan, setPlan] = useState<PlanId>(next === "studio" ? "place" : "listen");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [copy, setCopy] = useState<Record<string, string>>({});
  const [issued, setIssued] = useState<{
    code: string;
    canTime: boolean;
    name: string;
  } | null>(null);

  useEffect(() => {
    void readMetroCopy()
      .then(setCopy)
      .catch(() => setCopy({}));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await registerPatron({
        data: { name, email, plan, deliver: "app" },
      });
      savePass({ token: result.token, ...result.patron });
      setIssued({
        code: result.code,
        canTime: result.patron.canTime,
        name: result.patron.name,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "今晚先這樣也好");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="classic-skin min-h-dvh bg-[#0c0c0d] text-[#ececec]">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <BrandMark />
        <Link to="/enter" className="text-xs tracking-wide text-white/55 hover:text-white">
          我有一次性密碼
        </Link>
      </header>

      <div className="mx-auto w-full max-w-lg px-6 py-12 sm:py-16">
        {issued ? (
          <IssuedCard
            issued={issued}
            afterword={copy.night_issued}
            onEnter={() => void navigate({ to: "/" })}
            onStudio={() => {
              sessionStorage.setItem("holdcue-open-studio", "1");
              void navigate({ to: "/" });
            }}
          />
        ) : (
          <>
            <p className="text-[11px] tracking-[0.28em] text-[#e85a12]">
              手工歌詞
            </p>
            <h1 className="mt-5 font-display text-[2.1rem] font-extrabold leading-tight tracking-wide">
              先支持，再對時
            </h1>
            <p className="mt-6 whitespace-pre-wrap text-[15px] leading-8 text-white/70">
              {copy.night_body ||
                "留下名字與 Email。\n付款後會拿到一組一次性密碼。\n這不是 Spotify，也不是著作權轉移。"}
            </p>

            <form onSubmit={(e) => void onSubmit(e)} className="mt-10 space-y-8">
              <section className="space-y-2">
                {PLAN_COPY.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id)}
                    className={cn(
                      "w-full rounded-none border-b px-1 py-3 text-left transition-colors",
                      plan === p.id
                        ? "border-amber-300"
                        : "border-white/15",
                    )}
                  >
                    <span className="block font-display text-lg text-white">{p.label}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-white/55">
                      {p.hint}
                    </span>
                  </button>
                ))}
              </section>

              <section className="space-y-4">
                <Field label="你希望被怎麼叫" htmlFor="name">
                  <Input
                    id="name"
                    value={name}
                    required
                    autoComplete="name"
                    className="rounded-none border-0 border-b border-white/20 bg-transparent px-0 shadow-none focus:shadow-none"
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label="鑰匙放在哪（Email）" htmlFor="email">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    required
                    autoComplete="email"
                    className="rounded-none border-0 border-b border-white/20 bg-transparent px-0 shadow-none focus:shadow-none"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
              </section>

              <Button type="submit" size="lg" className="w-full rounded-full" disabled={busy}>
                {busy ? "在寫你的名字…" : copy.night_cta || "我在這裡"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function IssuedCard({
  issued,
  afterword,
  onEnter,
  onStudio,
}: {
  issued: { code: string; canTime: boolean; name: string };
  afterword?: string;
  onEnter: () => void;
  onStudio: () => void;
}) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.28em] text-amber-200">今晚的票</p>
      <h1 className="mt-5 font-display text-3xl font-extrabold leading-snug">
        {issued.name}，我們知道了。
      </h1>
      <p className="mt-10 text-center font-display text-4xl font-extrabold tracking-[0.28em]">
        {issued.code}
      </p>
      <p className="night-letter mt-6 text-center text-sm leading-7 text-white/70">
        {afterword || "這是今晚的票。出站就作廢。我們不會再問一次。"}
      </p>
      <div className="mt-12 flex flex-col gap-2">
        <Button type="button" size="lg" className="rounded-full" onClick={onEnter}>
          進站
        </Button>
        {issued.canTime ? (
          <Button type="button" variant="ghost" size="lg" onClick={onStudio}>
            我想親手安放
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="text-white/50">
        {label}
      </Label>
      {children}
    </div>
  );
}

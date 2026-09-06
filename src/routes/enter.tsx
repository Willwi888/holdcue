import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BrandMark } from "@/components/step-nav";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { redeemPatronCode } from "@/lib/patrons";
import { savePass } from "@/lib/pass-session";

export const Route = createFileRoute("/enter")({ component: EnterPage });

function EnterPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await redeemPatronCode({ data: { code } });
      savePass({ token: result.token, ...result.patron });
      await navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "密碼無效");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="classic-skin min-h-dvh bg-[#0c0c0d] text-[#ececec]">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <BrandMark />
        <Link to="/support" search={{ next: "" }} className="text-xs tracking-wide text-white/60 hover:text-white">
          還沒支持
        </Link>
      </header>
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-64px)] w-full max-w-md flex-col justify-center px-6 py-16">
        <p className="text-xs font-medium tracking-[0.22em] text-accent">
          一次性密碼
        </p>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">
          把發給你的那組，放進來。
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          這是聽眾的門。進門之後是動態歌詞，或親手安放。不是串流平台。
        </p>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="code">密碼</Label>
            <Input
              id="code"
              value={code}
              required
              autoCapitalize="characters"
              autoComplete="one-time-code"
              placeholder="XXXX-XXXX"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "核對中…" : "進入"}
          </Button>
        </form>
      </div>
    </div>
  );
}

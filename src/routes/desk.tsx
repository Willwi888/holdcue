import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { BrandMark } from "@/components/step-nav";
import { MetroBackdrop } from "@/components/metro/backdrop";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  createDeskStation,
  deleteDeskStation,
  listDeskStations,
  readMetroCopy,
  saveDeskStation,
  saveMetroCopy,
  setDeskPassphrase,
  unlockDesk,
  type StationDesk,
} from "@/lib/metro-cms";
import { applyCopyToLive } from "@/lib/metro-live";
import {
  issueDeskPatron,
  listDeskPatrons,
  PLAN_COPY,
  revokeDeskPatron,
  type PatronDesk,
  type PlanId,
} from "@/lib/patrons";

export const Route = createFileRoute("/desk")({ component: DeskPage });

const DESK_KEY = "metro-desk";
type Tab = "copy" | "stations" | "idents" | "tickets" | "lock";

function DeskPage() {
  const [token, setToken] = useState("");
  const [phrase, setPhrase] = useState("");
  const [tab, setTab] = useState<Tab>("copy");
  const [stations, setStations] = useState<StationDesk[]>([]);
  const [copy, setCopy] = useState<Record<string, string>>({});
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
      const [rows, texts] = await Promise.all([
        listDeskStations({ data: { token: deskToken } }),
        readMetroCopy(),
      ]);
      setStations(rows);
      setCopy(texts);
      applyCopyToLive(texts);
      try {
        setPatrons(await listDeskPatrons({ data: { token: deskToken } }));
      } catch {
        setPatrons([]);
      }
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
          <h1 className="mt-3 text-2xl font-medium text-[#222]">司機室</h1>
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
          <span className="text-[11px] tracking-[0.2em] text-amber-200">司機室 · 不對外</span>
          <button type="button" className="text-xs text-white/45 hover:text-white" onClick={leave}>
            離開
          </button>
        </div>
      </header>
      <nav className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-3 text-xs tracking-wide">
        {(
          [
            ["copy", "文字"],
            ["stations", "車站"],
            ["idents", "識別片"],
            ["tickets", "今晚的票"],
            ["lock", "口令"],
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
        {tab === "copy" && (
          <section>
            <h2 className="font-display text-xl font-extrabold">聽眾看得到的句子</h2>
            <p className="mt-1 text-sm text-white/50">改這裡，Git 不用動。下次進站就換成新的話。</p>
            <CopyFields copy={copy} onChange={setCopy} />
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() =>
                void saveMetroCopy({
                  data: {
                    token,
                    entries: [
                      "night_kicker",
                      "night_lead",
                      "night_body",
                      "night_cta",
                      "night_issued",
                      "line_led",
                    ].map((key) => ({ key, value: copy[key] ?? "" })),
                  },
                }).then(() => {
                  applyCopyToLive(copy);
                  toast.success("文字已放下");
                })
              }
            >
              儲存文字
            </Button>
          </section>
        )}

        {tab === "stations" && (
          <section className="space-y-6">
            <h2 className="font-display text-xl font-extrabold">各站</h2>
            <p className="text-sm text-white/50">
              每一站的歌、封面、廣播，從這裡換。不要把音源網址貼在聽眾頁。
            </p>
            <NewStation
              token={token}
              onCreated={(row) => setStations((cur) => [...cur, row])}
            />
            {stations.map((st) => (
              <StationEditor
                key={st.slug}
                station={st}
                token={token}
                onSaved={(next) =>
                  setStations((cur) => cur.map((row) => (row.slug === next.slug ? next : row)))
                }
                onDeleted={(slug) => setStations((cur) => cur.filter((row) => row.slug !== slug))}
              />
            ))}
          </section>
        )}

        {tab === "idents" && (
          <IdentFields
            copy={copy}
            token={token}
            onChange={setCopy}
            onSaved={() => applyCopyToLive(copy)}
          />
        )}

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

function CopyFields({
  copy,
  onChange,
}: {
  copy: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const fields = [
    ["line_led", "月台走馬燈"],
    ["night_kicker", "深夜模式小標"],
    ["night_lead", "第一句"],
    ["night_body", "內文"],
    ["night_cta", "按鈕"],
    ["night_issued", "發票之後"],
  ] as const;
  return (
    <div className="mt-4 space-y-3">
      {fields.map(([key, label]) => (
        <div key={key}>
          <Label>{label}</Label>
          {key === "night_body" || key === "night_issued" ? (
            <Textarea
              className="min-h-32"
              value={copy[key] ?? ""}
              onChange={(e) => onChange({ ...copy, [key]: e.target.value })}
            />
          ) : (
            <Input
              value={copy[key] ?? ""}
              onChange={(e) => onChange({ ...copy, [key]: e.target.value })}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function IdentFields({
  copy,
  token,
  onChange,
  onSaved,
}: {
  copy: Record<string, string>;
  token: string;
  onChange: (next: Record<string, string>) => void;
  onSaved: () => void;
}) {
  const fields = [
    ["ident_in_url", "網站進站片 in（https）", "聽眾輸入密碼後播放，不成片"],
    ["ident_play_url", "成片片頭 / 到站 playsong（https）", "預設 play.mp4"],
    ["ident_out_url", "出站與成片片尾 out（https）", "預設 out.mp4"],
    ["bg_url", "網站底圖影片（https）", "預設 bg.mp4"],
    ["poster_url", "底圖封面（https）", "預設專輯封面"],
  ] as const;
  return (
    <section>
      <h2 className="font-display text-xl font-extrabold">識別片與底圖</h2>
      <p className="mt-1 text-sm leading-relaxed text-white/50">
        大檔不要塞進 Git。請把新片子放到雲端（Vercel Blob、Cloudinary、或你的空間），把 https 網址貼在這裡。留空就用倉庫裡的預設片。
      </p>
      <div className="mt-4 space-y-3">
        {fields.map(([key, label, hint]) => (
          <div key={key}>
            <Label>{label}</Label>
            <Input
              value={copy[key] ?? ""}
              placeholder={hint}
              onChange={(e) => onChange({ ...copy, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <Button
        className="mt-4"
        onClick={() =>
          void saveMetroCopy({
            data: {
              token,
              entries: fields.map(([key]) => ({ key, value: copy[key] ?? "" })),
            },
          })
            .then(() => {
              onSaved();
              toast.success("識別片已換上");
            })
            .catch((err) => toast.error(err instanceof Error ? err.message : "沒有存到"))
        }
      >
        儲存識別片
      </Button>
    </section>
  );
}

function NewStation({
  token,
  onCreated,
}: {
  token: string;
  onCreated: (row: StationDesk) => void;
}) {
  const [title, setTitle] = useState("");
  const [en, setEn] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="rounded-[20px] border border-dashed border-amber-300/30 p-4">
      <p className="text-[11px] tracking-[0.18em] text-amber-200">加一站</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>站名</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：空位" />
        </div>
        <div>
          <Label>英文（會變成網址代號）</Label>
          <Input value={en} onChange={(e) => setEn(e.target.value)} placeholder="Empty Seat" />
        </div>
      </div>
      <Button
        className="mt-3"
        size="sm"
        disabled={busy || !title.trim()}
        onClick={() => {
          setBusy(true);
          void createDeskStation({ data: { token, title, en, isOpen: false } })
            .then((row) => {
              onCreated(row);
              setTitle("");
              setEn("");
              toast.success(`${row.title} 已加進路線，先關著，你準備好再開放`);
            })
            .catch((err) => toast.error(err instanceof Error ? err.message : "沒有加上"))
            .finally(() => setBusy(false));
        }}
      >
        加入路線
      </Button>
    </div>
  );
}

function StationEditor({
  station,
  token,
  onSaved,
  onDeleted,
}: {
  station: StationDesk;
  token: string;
  onSaved: (row: StationDesk) => void;
  onDeleted: (slug: string) => void;
}) {
  const [title, setTitle] = useState(station.title);
  const [en, setEn] = useState(station.en);
  const [desc, setDesc] = useState(station.desc);
  const [copy, setCopy] = useState(station.copy);
  const [audioUrl, setAudioUrl] = useState(station.audioUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(station.coverUrl ?? "");
  const [fileB64, setFileB64] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState("audio/mpeg");
  const [open, setOpen] = useState(station.isOpen);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await saveDeskStation({
        data: {
          token,
          slug: station.slug,
          title,
          en,
          desc,
          copy,
          audioUrl,
          coverUrl,
          audioB64: fileB64 ?? undefined,
          audioMime: fileMime,
          isOpen: open,
        },
      });
      const rows = await listDeskStations({ data: { token } });
      const next = rows.find((row) => row.slug === station.slug);
      if (next) onSaved(next);
      setFileB64(null);
      toast.success(`${title} 已放下`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "沒有存到");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-[20px] border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] tracking-[0.18em] text-amber-200">
        {station.code} · 聽眾只會看到你開放的站
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          checked={open}
          onChange={(e) => setOpen(e.target.checked)}
          className="accent-amber-300"
        />
        開放本站（乘客進站後才看得到這一場儀式）
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>站名</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>英文</Label>
          <Input value={en} onChange={(e) => setEn(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <Label>站長廣播（短句）</Label>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="mt-3">
        <Label>月台文字</Label>
        <Textarea className="min-h-28" value={copy} onChange={(e) => setCopy(e.target.value)} />
      </div>
      <div className="mt-3">
        <Label>封面網址（https，選填）</Label>
        <Input
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          placeholder="聽眾只會看到圖，不會看到這個網址欄"
        />
      </div>
      <div className="mt-3">
        <Label>音源網址（https，選填）</Label>
        <Input
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          placeholder="聽眾不會直接看到這個網址"
        />
      </div>
      <div className="mt-3">
        <Label>或上傳本站音檔（小於 6MB）</Label>
        <input
          type="file"
          accept="audio/*"
          className="mt-1 block w-full text-sm text-white/70"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 6 * 1024 * 1024) {
              toast.error("音檔請小於 6MB，大檔請改貼 https 網址");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              const raw = String(reader.result || "");
              const b64 = raw.split(",")[1] || "";
              setFileB64(b64);
              setFileMime(file.type || "audio/mpeg");
            };
            reader.readAsDataURL(file);
          }}
        />
        <p className="mt-1 text-[11px] text-white/40">
          {station.hasFile ? "已有上傳檔，再傳會覆蓋。" : "尚未上傳。"}
          {fileB64 ? " 這次會帶上新檔。" : ""}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => void save()}>
          {busy ? "放下中…" : "儲存這一站"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`確定把「${station.title}」移出路線？`)) return;
            void deleteDeskStation({ data: { token, slug: station.slug } })
              .then(() => {
                onDeleted(station.slug);
                toast.success("這一站已停駛");
              })
              .catch((err) => toast.error(err instanceof Error ? err.message : "沒有刪到"));
          }}
        >
          停駛
        </Button>
      </div>
    </article>
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

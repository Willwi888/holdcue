import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Showcase } from "@/components/showcase";
import { MetroBackdrop } from "@/components/metro/backdrop";
import { MetroClip } from "@/components/metro/clip";
import {
  INTRO_SEEN_KEY,
  METRO_FARES,
  METRO_RULES,
  markPlayed,
  readPlayed,
} from "@/lib/metro";
import { listPublicStations, type StationPublic } from "@/lib/metro-cms";
import { addGuestbookNote, listGuestbook, type GuestNote } from "@/lib/guestbook";
import { playMetroSfx, stopMetroSfx } from "@/lib/metro-sfx";
import { clearPass, readPass } from "@/lib/pass-session";
import { exitPatronSession } from "@/lib/patrons";
import { formatClock } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function MetroLine() {
  const navigate = useNavigate();
  const pass = readPass();
  const [stations, setStations] = useState<StationPublic[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [doors, setDoors] = useState<string | null>(null);
  const [played, setPlayed] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : readPlayed(),
  );
  const [broadcasting, setBroadcasting] = useState(false);
  const [driverOpen, setDriverOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    void listPublicStations()
      .then(setStations)
      .catch(() => setStations([]));
  }, []);

  const status =
    doors ??
    (broadcasting
      ? "列車長廣播中"
      : active == null
        ? "列車準備中　本班車不開往快樂"
        : `目前停靠　${stations[active]!.title}`);

  const arrivingRef = useRef<number | null>(null);

  const completeArrival = () => {
    const idx = arrivingRef.current;
    arrivingRef.current = null;
    setDoors(null);
    if (idx != null) setActive(idx);
    setPending(false);
  };

  const goStation = (idx: number) => {
    if (pending) return;
    const st = stations[idx];
    if (!st) return;
    arrivingRef.current = idx;
    setPending(true);
    setDoors(st.title);
    stopMetroSfx();
  };

  const exit = () => {
    stopMetroSfx();
    setLeaving(true);
  };

  const finishExit = async () => {
    const token = readPass()?.token;
    if (token) {
      try {
        await exitPatronSession({ data: { token } });
      } catch {
        /* still leave */
      }
    }
    clearPass();
    sessionStorage.removeItem(INTRO_SEEN_KEY);
    window.dispatchEvent(new Event("metro-pass"));
  };

  return (
    <div className="metro-skin">
      <MetroBackdrop />
      <div className="metro-dim" />
      <div className="relative z-10 pb-20">
        <div className="metro-platform" />
        <header className="px-4 pt-6 text-center">
          <p className="text-[11px] tracking-[0.32em] text-amber-200/80">
            WILLWI 情緒捷運線
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[0.16em] text-white">
            本線所有列車均不開往快樂
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/65">
            {pass?.name}，不是成功進站，是我們知道了。希望很快能不再次為您服務。
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
            後台開放的每一站，都是一場情緒儀式。車門打開之後，才是那首歌。
          </p>
        </header>

        <div className="metro-led metro-marquee sticky top-2 z-30 mx-auto mt-5 w-[min(92%,700px)] py-2 text-center text-[12px] tracking-[0.14em]">
          <span>{status}　·　請勿倚靠回憶　·　本班車不開往快樂　·　</span>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2 px-4">
          <button
            type="button"
            className="metro-pill px-4 py-2 text-xs"
            onClick={() => {
              if (broadcasting) {
                stopMetroSfx();
                setBroadcasting(false);
                return;
              }
              setBroadcasting(true);
              playMetroSfx("in", () => setBroadcasting(false));
            }}
          >
            {broadcasting ? "停止廣播" : "列車長廣播"}
          </button>
          <button
            type="button"
            className="metro-pill px-4 py-2 text-xs"
            onClick={() => void navigate({ to: "/support", search: { next: "night" } })}
          >
            深夜情緒模式
          </button>
          {pass?.canTime ? (
            <button
              type="button"
              className="metro-pill px-4 py-2 text-xs"
              onClick={() => {
                sessionStorage.setItem("holdcue-open-studio", "1");
                window.dispatchEvent(new Event("metro-studio"));
              }}
            >
              親手安放
            </button>
          ) : null}
          <button type="button" className="metro-pill px-4 py-2 text-xs" onClick={() => void exit()}>
            出站
          </button>
        </div>

        <section className="metro-map mx-auto mt-10 max-w-2xl px-6">
          {stations.map((st, idx) => {
            const isActive = active === idx;
            const used = played.includes(st.slug);
            return (
              <button
                key={st.slug}
                type="button"
                onClick={() => goStation(idx)}
                className={cn("metro-stop w-full text-left", isActive && "is-active")}
              >
                <p className="font-display text-lg tracking-wide text-white">
                  {st.title}
                  <span className="ml-2 text-xs font-sans tracking-normal text-white/45">
                    {st.en}
                  </span>
                </p>
                <p className="mt-1 text-sm text-white/60">{st.desc}</p>
                {used && (
                  <p className="mt-1 text-[11px] text-amber-200/70">本列車已過站，不會再播放</p>
                )}
              </button>
            );
          })}
        </section>

        {active != null && stations[active] && (
          <StationDock
            station={stations[active]!}
            alreadyPlayed={played.includes(stations[active]!.slug)}
            onPlayed={() => {
              markPlayed(stations[active]!.slug);
              setPlayed(readPlayed());
            }}
            canLyrics={Boolean(pass?.canLyrics)}
            onLyrics={() => void navigate({ to: "/lyrics" })}
          />
        )}

        <section className="mx-auto mt-14 max-w-2xl px-5">
          <p className="text-[11px] tracking-[0.22em] text-amber-200">最後一位乘客</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-white">完成的版本</h2>
          <p className="mt-2 text-sm text-white/60">
            這裡掛的是最後一位聽眾留下來的成片。頭尾各有六秒識別，方便被認出來。
          </p>
          <div className="mt-5">
            <Showcase compactHero quiet />
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-2xl px-5">
          <p className="text-[11px] tracking-[0.22em] text-amber-200">情緒票價表</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {METRO_FARES.map((fare) => (
              <div key={fare.from} className="rounded-[20px] bg-black/40 px-4 py-4 text-center">
                <p className="text-sm text-white">
                  {fare.from} → {fare.to}
                </p>
                <p className="mt-2 text-xs text-amber-200/80">{fare.cost}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-white/50">全線通用：僅支援心碎感應支付</p>
        </section>

        <Guestbook />

        <section className="mx-auto mt-14 max-w-2xl px-5">
          <p className="text-[11px] tracking-[0.22em] text-amber-200">乘車須知</p>
          <ol className="mt-4 space-y-4 text-sm leading-relaxed text-white/70">
            {METRO_RULES.map((rule) => (
              <li key={rule.n}>
                <p className="text-white">
                  {rule.n}. {rule.title}
                </p>
                <p className="mt-1">{rule.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto mt-14 max-w-sm px-5 text-center">
          <p className="text-[11px] tracking-[0.22em] text-amber-200">呼叫司機</p>
          <button type="button" className="mt-4" onClick={() => setDriverOpen(true)}>
            <img
              src="/metro/images/driver-qr.png"
              alt="官方 LINE"
              className="mx-auto w-36 rounded-[20px]"
            />
          </button>
          <p className="mt-3 text-xs text-white/50">列車仍在行駛中。有話想說，歡迎聯絡。</p>
        </section>

        <p className="mt-16 px-5 text-center text-[11px] text-white/35">
          WILLWI 情緒捷運線 · 僅支援心碎感應支付 · 不開往快樂
        </p>
      </div>

      {driverOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-6"
          onClick={() => setDriverOpen(false)}
        >
          <img
            src="/metro/images/driver-qr.png"
            alt="官方 LINE"
            className="max-h-[80vh] max-w-[85vw] rounded-[24px]"
          />
        </div>
      )}

      {doors && (
        <MetroClip kind="play" skipLabel="開啟車門" onEnded={completeArrival} />
      )}
      {leaving && (
        <MetroClip kind="out" skipLabel="出站" onEnded={() => void finishExit()} />
      )}
    </div>
  );
}

function StationDock({
  station,
  alreadyPlayed,
  onPlayed,
  canLyrics,
  onLyrics,
}: {
  station: StationPublic;
  alreadyPlayed: boolean;
  onPlayed: () => void;
  canLyrics: boolean;
  onLyrics: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);
  const locked = alreadyPlayed;
  const src = locked ? undefined : station.audioPlayUrl ?? undefined;

  useEffect(() => {
    setTime(0);
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    if (src && !locked) void el.play().catch(() => undefined);
  }, [station.slug, src, locked]);

  return (
    <section className="mx-auto mt-8 max-w-2xl px-5">
      <div className="rounded-[28px] border border-white/15 bg-black/55 p-5 backdrop-blur-md">
        <p className="text-[11px] tracking-[0.2em] text-amber-200">目前進站 · 情緒儀式</p>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-white">
          {station.title}
        </h2>
        <p className="text-sm text-white/50">{station.en}</p>
        <p className="mt-3 text-sm text-white/70">{station.desc}</p>
        <p className="night-letter mt-4 whitespace-pre-wrap text-[15px] leading-8 text-white/80">
          {station.copy}
        </p>
        {src && (
          <audio
            ref={audioRef}
            src={src}
            playsInline
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onEnded={() => onPlayed()}
            className="mt-5 w-full"
            controls
          />
        )}
        {!src && (
          <p className="mt-4 text-sm text-white/40">這一站還沒有放上音源。</p>
        )}
        {locked && (
          <p className="mt-4 text-sm text-amber-200">請勿倚靠回憶。這班車已經過站。</p>
        )}
        {src && !locked && (
          <p className="mt-2 text-[11px] text-white/40">{formatClock(time)}</p>
        )}
        {canLyrics && (
          <button
            type="button"
            className="metro-pill mt-5 px-5 py-2 text-xs"
            onClick={onLyrics}
          >
            動態歌詞頁
          </button>
        )}
      </div>
    </section>
  );
}

function Guestbook() {
  const [notes, setNotes] = useState<GuestNote[]>([]);
  const [body, setBody] = useState("");
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = () => {
    void listGuestbook()
      .then(setNotes)
      .catch(() => setNotes([]));
  };

  useEffect(() => {
    reload();
  }, []);

  const pass = useMemo(() => readPass(), []);

  const submit = async () => {
    if (!body.trim() || !pass?.token) return;
    setBusy(true);
    try {
      await addGuestbookNote({
        data: { token: pass.token, body: body.trim(), anonymous: anon },
      });
      setBody("");
      playMetroSfx("out");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "留言沒有送出");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto mt-14 max-w-2xl px-5">
      <p className="text-[11px] tracking-[0.22em] text-amber-200">乘客留言板</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold text-white">請先誠實面對自己</h2>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={280}
        placeholder="寫給這一站的話"
        className="mt-4 w-full rounded-[20px] border border-white/15 bg-black/50 p-4 text-sm text-white outline-none focus:border-amber-300"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="text-xs text-white/60">
          <input
            type="checkbox"
            checked={anon}
            onChange={(e) => setAnon(e.target.checked)}
            className="mr-2 accent-amber-300"
          />
          一位乘客（不具名）
        </label>
        <button
          type="button"
          className="metro-pill ml-auto px-5 py-2 text-xs"
          disabled={busy || !body.trim()}
          onClick={() => void submit()}
        >
          {busy ? "發佈中…" : "發佈留言"}
        </button>
      </div>
      <div className="mt-6 space-y-3">
        {notes.map((note) => (
          <article key={note.id} className="rounded-[20px] bg-white/5 px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/85">
              {note.body}
            </p>
            <p className="mt-2 text-[11px] text-white/40">— {note.author}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

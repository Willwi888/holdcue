import { useEffect, useRef, useState } from "react";
import { Download, FileText, Film, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/components/audio-host";
import { Button } from "@/components/ui/button";
import { VideoStage, paint } from "@/components/studio/video-stage";
import { AFTERWORD, RIGHTS } from "@/lib/copy";
import { addFinishedFilm, MAX_FILM_BYTES } from "@/lib/films";
import { toLrc } from "@/lib/lrc";
import { blobToBase64, fileToJpegDataUrl } from "@/lib/media-file";
import { timedCount, useProject } from "@/lib/store";
import { RESOLUTIONS } from "@/lib/types";
import { preloadFonts, loadImage, preloadIdentVideos, filmIdentPads } from "@/lib/video/assets";
import { encodeLyricVideo } from "@/lib/video/encode";
import { downloadBlob, formatClock } from "@/lib/utils";

export function ExportStudio() {
  const s = useProject();
  const { time, duration, playing, toggle, seek } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const encodeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const [encoded, setEncoded] = useState<{ blob: Blob; ext: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void preloadFonts();
    const urls = [s.coverUrl, s.portraitUrl].filter(Boolean) as string[];
    urls.forEach((u) => void loadImage(u).catch(() => null));
  }, [s.coverUrl, s.portraitUrl]);

  const timed = timedCount(s.lines);
  const filenameBase = (s.title || "lyrics").replace(/\s+/g, "-");

  const downloadLrc = () => {
    const text = toLrc(s, s.lines);
    downloadBlob(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
      `${filenameBase}.lrc`,
    );
    toast.success("已下載 LRC");
  };

  const downloadJson = () => {
    const payload = {
      title: s.title,
      artist: s.artist,
      album: s.album,
      subtitle: s.subtitle,
      isrc: s.isrc,
      upc: s.upc,
      releaseDate: s.releaseDate,
      label: s.label,
      links: s.links,
      lines: s.lines,
      animStyle: s.animStyle,
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
      `${filenameBase}.json`,
    );
  };

  const runEncode = async () => {
    if (!s.audioUrl) {
      toast.error("請先加入音源");
      return;
    }
    if (timed === 0) {
      toast.error("還沒有對時的句子");
      return;
    }
    const { w, h } = RESOLUTIONS[s.resolution];
    const canvas = encodeCanvasRef.current ?? document.createElement("canvas");
    encodeCanvasRef.current = canvas;
    canvas.width = w;
    canvas.height = h;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    setProgress(0);
    setPhase("準備編碼");

    try {
      await preloadFonts();
      preloadIdentVideos();
      if (s.coverUrl) await loadImage(s.coverUrl).catch(() => null);
      if (s.portraitUrl) await loadImage(s.portraitUrl).catch(() => null);

      const pads = filmIdentPads();
      const songDur = duration || 1;
      const totalDur = songDur + pads.head + pads.tail;

      const result = await encodeLyricVideo({
        canvas,
        duration: totalDur,
        resolution: s.resolution,
        audioUrl: s.audioUrl,
        title: s.title,
        artist: s.artist,
        album: s.album,
        audioPadHead: pads.head,
        audioPadTail: pads.tail,
        signal: ac.signal,
        onFrame: (t) =>
          paint(canvas, t, totalDur, {
            withIdents: true,
            identHead: pads.head,
            identTail: pads.tail,
          }),
        onProgress: (p) => {
          setProgress(p.ratio);
          setPhase(
            p.phase === "audio"
              ? "讀取音訊"
              : p.phase === "mux"
                ? "封裝檔案"
                : `繪製畫面 ${p.frame}/${p.total}`,
          );
        },
      });
      downloadBlob(result.blob, `${filenameBase}.${result.filenameExt}`);
      setEncoded({ blob: result.blob, ext: result.filenameExt });
      toast.success(
        result.hasAudio
          ? `已下載 ${result.filenameExt.toUpperCase()}`
          : `已下載畫面（此瀏覽器無法內嵌音訊，檔案為純畫面）`,
      );
      if (result.blob.size <= MAX_FILM_BYTES) {
        try {
          const coverB64 = s.coverUrl
            ? await fileToJpegDataUrl(s.coverUrl)
            : undefined;
          const videoB64 = await blobToBase64(result.blob);
          await addFinishedFilm({
            data: {
              title: s.title || "未命名完成品",
              artist: s.artist || "Willwi",
              album: s.album,
              caption: s.subtitle,
              coverB64,
              videoB64,
              videoMime: result.blob.type || "video/mp4",
            },
          });
          toast.success("已掛上最後一位乘客的成片");
        } catch {
          /* download still succeeded */
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.message("已取消輸出");
      } else {
        toast.error(err instanceof Error ? err.message : "輸出失敗");
      }
    } finally {
      setBusy(false);
      setPhase("");
    }
  };

  const publishHome = async () => {
    if (!encoded) {
      toast.error("請先輸出影片");
      return;
    }
    if (encoded.blob.size > MAX_FILM_BYTES) {
      toast.error("成片超過 12MB，請改在首頁貼上網址");
      return;
    }
    setPublishing(true);
    try {
      const coverB64 = s.coverUrl
        ? await fileToJpegDataUrl(s.coverUrl)
        : undefined;
      const videoB64 = await blobToBase64(encoded.blob);
      await addFinishedFilm({
        data: {
          title: s.title || "未命名完成品",
          artist: s.artist || "Willwi",
          album: s.album,
          caption: s.subtitle,
          coverB64,
          videoB64,
          videoMime: encoded.blob.type || "video/mp4",
        },
      });
      toast.success("已掛上最後一位乘客的成片");
      s.setStep("home");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發布失敗");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <header className="rise-in mb-8 max-w-2xl">
        <p className="mb-2 text-xs font-medium tracking-[0.18em] text-accent">
          STEP 04
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          輸出歌詞影片
        </h1>
        <div className="mt-4 max-w-md space-y-2 text-sm leading-relaxed text-muted">
          {AFTERWORD.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)]">
        <div className="rise-in rise-in-1">
          <VideoStage
            time={time}
            duration={duration}
            canvasRef={canvasRef}
          />
        </div>

        <div className="rise-in rise-in-2 space-y-5">
          <section className="rounded-[20px] bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)]">
            <h2 className="font-display text-sm font-semibold">成片資訊</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="歌曲" v={s.title || "—"} />
              <Row k="歌手" v={s.artist || "—"} />
              <Row k="專輯" v={s.album || "—"} />
              <Row k="風格" v={s.animStyle} />
              <Row k="字體" v={s.lyricFont ?? "sans"} />
              <Row k="大小" v={s.lyricSize ?? "m"} />
              <Row k="解析度" v={RESOLUTIONS[s.resolution].label} />
              <Row k="時長" v={formatClock(duration)} />
              <Row k="已對時" v={`${timed} / ${s.lines.length}`} />
            </dl>
          </section>

          {busy && (
            <div className="rounded-[20px] bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)]">
              <div className="mb-2 flex items-center justify-between text-xs text-muted">
                <span>{phase}</span>
                <span className="tabular">{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-150"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
          )}

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={busy || timed === 0}
            onClick={() => void runEncode()}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                輸出中
              </>
            ) : (
              <>
                <Film className="size-4" />
                下載歌詞影片 MP4
              </>
            )}
          </Button>
          {busy && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => abortRef.current?.abort()}
            >
              取消
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            disabled={!encoded || publishing || busy}
            onClick={() => void publishHome()}
          >
            {publishing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            發布到首頁完成品牆
          </Button>

          <section className="rounded-[20px] bg-surface p-5 text-sm leading-relaxed shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)]">
            <p className="text-xs font-medium tracking-[0.16em] text-accent">
              {RIGHTS.kicker}
            </p>
            <div className="mt-3 space-y-2 text-muted">
              {RIGHTS.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={downloadLrc}
            >
              <FileText className="size-4" />
              LRC
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={downloadJson}
            >
              <Download className="size-4" />
              JSON
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => s.setStep("style")}
            >
              返回畫面
            </Button>
            <Button type="button" variant="ghost" onClick={toggle}>
              {playing ? "暫停" : "播放"}預覽
            </Button>
            <Button type="button" variant="ghost" onClick={() => seek(0)}>
              重播
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="truncate text-right">{v}</dd>
    </div>
  );
}

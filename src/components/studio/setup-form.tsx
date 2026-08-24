import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { ImageIcon, Link2, Music, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { CatalogPicker } from "@/components/studio/catalog-picker";
import { DEMO_AUDIO, DEMO_COVER, DEMO_PORTRAIT } from "@/lib/demo-data";
import { saveFile } from "@/lib/files";
import { parseLrc } from "@/lib/lrc";
import { useProject } from "@/lib/store";
import { readPass } from "@/lib/pass-session";
import { cn } from "@/lib/utils";

export function SetupForm() {
  const s = useProject();
  const [dragOver, setDragOver] = useState<string | null>(null);

  const goCue = () => {
    if (!readPass()?.canTime) {
      window.location.assign("/support?next=studio");
      return;
    }
    if (!s.lyricsText.trim()) s.setLyricsText(s.lyricsText);
    s.setStep("cue");
  };

  const canCue = Boolean(s.lyricsText.trim()) && Boolean(s.audioUrl);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <header className="rise-in mb-8 max-w-2xl">
        <p className="mb-2 text-xs font-medium tracking-[0.18em] text-accent">
          STEP 01
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          專案資料
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          從 Willwi Archive 選歌，或自行上傳音源、封面與歌詞。對時後輸出歌詞影片。
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => s.newProject()}
          >
            清空重來
          </Button>
        </div>
      </header>

      <div className="rise-in mb-8">
        <CatalogPicker />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="rise-in rise-in-1 space-y-6">
          <section className="rounded-[24px] bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)] sm:p-6">
            <h2 className="mb-4 font-display text-sm font-semibold tracking-wide">
              歌曲
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="歌曲名稱" htmlFor="title">
                <Input
                  id="title"
                  value={s.title}
                  placeholder="空位"
                  onChange={(e) => s.patch({ title: e.target.value })}
                />
              </Field>
              <Field label="歌手" htmlFor="artist">
                <Input
                  id="artist"
                  value={s.artist}
                  placeholder="Willwi"
                  onChange={(e) => s.patch({ artist: e.target.value })}
                />
              </Field>
              <Field label="專輯" htmlFor="album">
                <Input
                  id="album"
                  value={s.album}
                  placeholder="HEART BREAK"
                  onChange={(e) => s.patch({ album: e.target.value })}
                />
              </Field>
              <Field label="發行日期" htmlFor="date">
                <Input
                  id="date"
                  type="date"
                  value={s.releaseDate}
                  onChange={(e) => s.patch({ releaseDate: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="主打句 / 副標（影片疊字）" htmlFor="sub">
                  <Input
                    id="sub"
                    value={s.subtitle}
                    placeholder="你織的圍巾 還繞著我的寂寞"
                    onChange={(e) => s.patch({ subtitle: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)] sm:p-6">
            <h2 className="mb-4 font-display text-sm font-semibold tracking-wide">
              發行資訊
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="廠牌 Record Label" htmlFor="label">
                <Input
                  id="label"
                  value={s.label}
                  placeholder="Willwi Music"
                  onChange={(e) => s.patch({ label: e.target.value })}
                />
              </Field>
              <Field label="UPC" htmlFor="upc">
                <Input
                  id="upc"
                  value={s.upc}
                  placeholder="825324577508"
                  onChange={(e) => s.patch({ upc: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="ISRC" htmlFor="isrc">
                  <Input
                    id="isrc"
                    value={s.isrc}
                    placeholder="尚未取得可留空"
                    onChange={(e) => s.patch({ isrc: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)] sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold tracking-wide">
                連結
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={s.addLink}
              >
                <Plus className="size-4" />
                新增
              </Button>
            </div>
            <div className="space-y-3">
              {s.links.map((link) => (
                <div key={link.id} className="flex gap-2">
                  <Input
                    className="w-32 shrink-0"
                    placeholder="平台"
                    value={link.label}
                    onChange={(e) =>
                      s.updateLink(link.id, { label: e.target.value })
                    }
                    aria-label="連結名稱"
                  />
                  <Input
                    placeholder="https://"
                    value={link.url}
                    onChange={(e) =>
                      s.updateLink(link.id, { url: e.target.value })
                    }
                    aria-label="連結網址"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => s.removeLink(link.id)}
                    aria-label="刪除此連結"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-subtle">
              <Link2 className="size-3.5" />
              片尾會列出有填寫網址的連結
            </p>
          </section>
        </div>

        <div className="rise-in rise-in-2 space-y-6">
          <AssetCard
            icon={<Music className="size-4" />}
            title="音源"
            hint="上傳檔案或貼上音訊網址"
            accept="audio/*"
            dragOver={dragOver === "audio"}
            onDragState={(v) => setDragOver(v ? "audio" : null)}
            onFile={async (file) => {
              await saveFile("audio", file);
              s.setAudio(URL.createObjectURL(file), file.name, false);
            }}
            urlValue={s.usingDemoAudio ? DEMO_AUDIO : ""}
            onUrl={(url) => {
              if (!url) return;
              s.setAudio(url, url.split("/").pop() ?? "audio", false);
            }}
            preview={
              s.audioUrl ? (
                <p className="truncate text-xs text-muted">
                  {s.audioName || s.audioUrl}
                </p>
              ) : null
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <AssetCard
              icon={<ImageIcon className="size-4" />}
              title="專輯封面"
              hint="方圖最佳"
              accept="image/*"
              dragOver={dragOver === "cover"}
              onDragState={(v) => setDragOver(v ? "cover" : null)}
              onFile={async (file) => {
                await saveFile("cover", file);
                s.setCover(URL.createObjectURL(file), false);
              }}
              urlValue=""
              onUrl={(url) => url && s.setCover(url, false)}
              preview={
                s.coverUrl ? (
                  <img
                    src={s.coverUrl}
                    alt="專輯封面預覽"
                    className="mt-3 aspect-square w-full rounded-[12px] object-cover outline outline-1 -outline-offset-1 outline-white/10"
                  />
                ) : null
              }
            />
            <AssetCard
              icon={<ImageIcon className="size-4" />}
              title="人像背景"
              hint="可留空，預設用封面"
              accept="image/*"
              dragOver={dragOver === "portrait"}
              onDragState={(v) => setDragOver(v ? "portrait" : null)}
              onFile={async (file) => {
                await saveFile("portrait", file);
                s.setPortrait(URL.createObjectURL(file), false);
              }}
              urlValue=""
              onUrl={(url) => url && s.setPortrait(url, false)}
              preview={
                s.portraitUrl ? (
                  <img
                    src={s.portraitUrl}
                    alt="人像背景預覽"
                    className="mt-3 aspect-[4/5] w-full rounded-[12px] object-cover outline outline-1 -outline-offset-1 outline-white/10"
                  />
                ) : (
                  s.coverUrl && (
                    <p className="mt-2 text-xs text-subtle">將使用專輯封面</p>
                  )
                )
              }
            />
          </div>

          <section className="rounded-[24px] bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)] sm:p-6">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-semibold tracking-wide">
                  歌詞
                </h2>
                <p className="mt-1 text-xs text-subtle">
                  一行一句。也可貼上 LRC。
                </p>
              </div>
              <span className="text-xs tabular text-muted">
                {s.lines.length} 句
              </span>
            </div>
            <Textarea
              value={s.lyricsText}
              placeholder="把歌詞貼在這裡…"
              className="min-h-72 font-[inherit] leading-8"
              onChange={(e) => s.setLyricsText(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (parseLrc(s.lyricsText).lines.length) s.importLrc(s.lyricsText);
                }}
              >
                偵測並匯入 LRC
              </Button>
            </div>
          </section>
        </div>
      </div>

      <div className="sticky bottom-4 z-10 mt-10 flex justify-end">
        <Button
          type="button"
          size="lg"
          disabled={!canCue}
          onClick={goCue}
          className="min-w-40 shadow-[0_12px_40px_-12px_rgb(232_90_18_/_0.7)]"
        >
          開始對時
        </Button>
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
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function AssetCard({
  icon,
  title,
  hint,
  accept,
  onFile,
  onUrl,
  urlValue,
  preview,
  dragOver,
  onDragState,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  accept: string;
  onFile: (file: File) => void | Promise<void>;
  onUrl: (url: string) => void;
  urlValue: string;
  preview: ReactNode;
  dragOver: boolean;
  onDragState: (v: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(urlValue);

  const take = (file?: File | null) => {
    if (file) void onFile(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    onDragState(false);
    take(e.dataTransfer.files?.[0]);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    take(e.target.files?.[0]);
    e.target.value = "";
  };

  return (
    <section className="rounded-[24px] bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)] sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-muted">{icon}</span>
        <h2 className="font-display text-sm font-semibold tracking-wide">
          {title}
        </h2>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          onDragState(true);
        }}
        onDragLeave={() => onDragState(false)}
        onDrop={onDrop}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-[16px] px-4 py-6 text-center transition-[background-color,box-shadow] duration-150",
          dragOver
            ? "bg-accent/10 shadow-[0_0_0_1px_var(--color-accent)]"
            : "bg-surface-2 shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)] hover:bg-surface-2/80",
        )}
      >
        <Upload className="mb-2 size-5 text-muted" />
        <span className="text-sm">拖放或點擊上傳</span>
        <span className="mt-1 text-xs text-subtle">{hint}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onChange}
      />
      <div className="mt-3 flex gap-2">
        <Input
          placeholder="或貼上網址"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onUrl(url.trim());
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => onUrl(url.trim())}
        >
          套用
        </Button>
      </div>
      {preview}
      {title === "音源" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() =>
            useProject
              .getState()
              .setAudio(DEMO_AUDIO, "demo-empty-seat.mp3", true)
          }
        >
          使用示範音軌
        </Button>
      )}
      {title === "專輯封面" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => useProject.getState().setCover(DEMO_COVER, true)}
        >
          使用示範封面
        </Button>
      )}
      {title === "人像背景" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => useProject.getState().setPortrait(DEMO_PORTRAIT, true)}
        >
          使用示範人像
        </Button>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { Film } from "lucide-react";
import {
  listFinishedFilms,
  youtubeIdFromUrl,
  type FinishedFilm,
} from "@/lib/films";
import { cn } from "@/lib/utils";

export function Showcase({
  compactHero = false,
  quiet = false,
}: {
  compactHero?: boolean;
  quiet?: boolean;
}) {
  const [films, setFilms] = useState<FinishedFilm[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const reload = async () => {
    const rows = await listFinishedFilms();
    setFilms(rows);
    setActiveId((cur) => {
      if (cur && rows.some((f) => f.id === cur)) return cur;
      return rows[0]?.id ?? null;
    });
  };

  useEffect(() => {
    void reload().catch(() => setFilms([]));
  }, []);

  const active = films?.find((f) => f.id === activeId) ?? films?.[0] ?? null;

  return (
    <section className={cn("rise-in rise-in-3", compactHero ? "mt-0" : "mt-16")}>
      {!quiet && !compactHero && (
        <div className="mb-5">
          <p className="text-xs font-medium tracking-[0.18em] text-accent">
            最後一位乘客
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            完成的版本
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            最後一位聽眾留下來的成片。每一個完成的版本，都是最好的版本。
          </p>
        </div>
      )}

      {!quiet && compactHero && (
        <div className="mb-3">
          <p className="text-xs font-medium tracking-[0.18em] text-accent">
            最後一位乘客
          </p>
        </div>
      )}

      <FeaturedSlot film={active} empty={!films || films.length === 0} />

      {films && films.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {films.map((film) => (
            <li key={film.id}>
              <button
                type="button"
                onClick={() => setActiveId(film.id)}
                className={cn(
                  "group w-full overflow-hidden rounded-[16px] text-left shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] transition-[box-shadow] duration-150",
                  film.id === active?.id
                    ? "shadow-[0_0_0_2px_var(--color-accent)]"
                    : "hover:shadow-[0_0_0_1px_rgb(255_255_255_/_0.2)]",
                )}
              >
                <span className="relative block aspect-video bg-surface-2">
                  {film.coverB64 ? (
                    <img
                      src={film.coverB64}
                      alt=""
                      className="size-full object-cover outline outline-1 -outline-offset-1 outline-white/10"
                    />
                  ) : (
                    <span className="grid size-full place-items-center text-subtle">
                      <Film className="size-5" />
                    </span>
                  )}
                </span>
                <span className="block truncate px-3 py-2 text-xs font-medium">
                  {film.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FeaturedSlot({
  film,
  empty,
}: {
  film: FinishedFilm | null;
  empty: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] bg-surface/50 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] backdrop-blur-sm">
      {film ? (
        <FilmPlayer film={film} />
      ) : (
        <div className="grid aspect-video place-items-center px-6 text-center">
          <div>
            <Film className="mx-auto mb-4 size-8 text-subtle" />
            <p className="font-display text-lg font-semibold">還沒有人把成片留下來</p>
            <p className="mt-2 text-sm text-muted">
              {empty ? "最後一位聽眾的作品會掛在這裡。" : "正在載入…"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function FilmPlayer({ film }: { film: FinishedFilm }) {
  const yt = film.videoUrl ? youtubeIdFromUrl(film.videoUrl) : null;
  return (
    <div>
      <div className="aspect-video bg-bg">
        {yt ? (
          <iframe
            title={film.title}
            src={`https://www.youtube.com/embed/${yt}`}
            className="size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : film.playUrl ? (
          <video
            key={film.id}
            className="size-full object-contain"
            src={film.playUrl}
            poster={film.coverB64 ?? undefined}
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted">
            沒有可播放的檔案
          </div>
        )}
      </div>
      <div className="px-5 py-4">
        <p className="font-display text-lg font-semibold">{film.title}</p>
        <p className="mt-1 text-sm text-muted">
          {film.artist}
          {film.album ? ` · ${film.album}` : ""}
        </p>
        {film.caption ? (
          <p className="mt-2 text-sm leading-relaxed text-subtle">{film.caption}</p>
        ) : null}
      </div>
    </div>
  );
}

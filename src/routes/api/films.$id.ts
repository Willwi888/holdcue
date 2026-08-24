import { createFileRoute } from "@tanstack/react-router";
import { selectFilmMedia } from "@/lib/films.server";

export const Route = createFileRoute("/api/films/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const media = await selectFilmMedia(params.id);
        if (!media) {
          return new Response("Not found", { status: 404 });
        }
        if (media.videoB64) {
          const body = Buffer.from(media.videoB64, "base64");
          return new Response(body, {
            headers: {
              "Content-Type": media.videoMime || "video/mp4",
              "Cache-Control": "public, max-age=3600",
              "Content-Length": String(body.byteLength),
            },
          });
        }
        if (media.videoUrl) {
          return Response.redirect(media.videoUrl, 302);
        }
        return new Response("No video", { status: 404 });
      },
    },
  },
});

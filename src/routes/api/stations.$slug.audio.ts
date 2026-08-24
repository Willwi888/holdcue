import { createFileRoute } from "@tanstack/react-router";
import { selectStationAudio } from "@/lib/metro-cms.server";

export const Route = createFileRoute("/api/stations/$slug/audio")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const media = await selectStationAudio(params.slug);
        if (!media) return new Response("Not found", { status: 404 });
        if (media.b64) {
          const body = Buffer.from(media.b64, "base64");
          return new Response(body, {
            headers: {
              "Content-Type": media.mime || "audio/mpeg",
              "Cache-Control": "public, max-age=3600",
              "Content-Length": String(body.byteLength),
            },
          });
        }
        if (media.url) return Response.redirect(media.url, 302);
        return new Response("No audio", { status: 404 });
      },
    },
  },
});

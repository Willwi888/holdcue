import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { MetroAssetsBoot } from "@/components/metro/assets-boot";
import { SpaceField } from "@/components/space-field";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

const APP_NAME = "WILLWI 情緒捷運線";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content: "本線所有列車均不開往快樂。WILLWI 情緒捷運線。",
      },
      { name: "theme-color", content: "#05070c" },
    ],
    links: [
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700&family=Noto+Serif+TC:wght@400;500;600;700&family=Permanent+Marker&family=Share+Tech+Mono&family=Syne:wght@600;700;800&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="zh-Hant" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <MetroAssetsBoot />
        <SpaceField />
        <AuthProvider>
          <div className="relative z-10">
            <Outlet />
          </div>
        </AuthProvider>
        <Toaster
          theme="dark"
          position="bottom-center"
          toastOptions={{
            className: "!bg-surface-2 !text-fg !border-border",
          }}
        />
        <Scripts />
      </body>
    </html>
  ),
});

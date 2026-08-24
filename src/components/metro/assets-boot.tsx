import { useEffect } from "react";
import { readMetroCopy } from "@/lib/metro-cms";
import { applyCopyToLive } from "@/lib/metro-live";
import { preloadIdentVideos } from "@/lib/video/assets";

export function MetroAssetsBoot() {
  useEffect(() => {
    void readMetroCopy()
      .then((copy) => {
        applyCopyToLive(copy);
        preloadIdentVideos();
      })
      .catch(() => undefined);
  }, []);
  return null;
}

import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  WebMOutputFormat,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
} from "mediabunny";
import type { AudioCodec, VideoCodec } from "mediabunny";
import { RESOLUTIONS, type Resolution } from "@/lib/types";
import { decodeAudio } from "@/lib/waveform";

export type EncodeProgress = {
  ratio: number;
  phase: "audio" | "frames" | "mux";
  frame: number;
  total: number;
};

export type EncodeResult = {
  blob: Blob;
  filenameExt: "mp4" | "webm";
  hasAudio: boolean;
};

export async function encodeLyricVideo(opts: {
  canvas: HTMLCanvasElement;
  duration: number;
  fps?: number;
  resolution: Resolution;
  audioUrl: string | null;
  title?: string;
  artist?: string;
  album?: string;
  audioPadHead?: number;
  audioPadTail?: number;
  onFrame: (t: number) => void;
  onProgress?: (p: EncodeProgress) => void;
  signal?: AbortSignal;
}): Promise<EncodeResult> {
  const fps = opts.fps ?? 30;
  const { w, h } = RESOLUTIONS[opts.resolution];
  opts.canvas.width = w;
  opts.canvas.height = h;

  const videoCodec = await getFirstEncodableVideoCodec(["avc", "hevc", "vp9", "av1"]);
  if (!videoCodec) {
    throw new Error("這個瀏覽器無法編碼影片。請改用最新版 Chrome 或 Edge。");
  }

  let audioBuffer: AudioBuffer | null = null;
  if (opts.audioUrl) {
    opts.onProgress?.({ ratio: 0.02, phase: "audio", frame: 0, total: 1 });
    try {
      audioBuffer = await decodeAudio(opts.audioUrl);
    } catch {
      audioBuffer = null;
    }
  }
  throwIfAborted(opts.signal);

  const audioCodec: AudioCodec | null = audioBuffer
    ? ((await getFirstEncodableAudioCodec(["aac", "opus"])) ?? null)
    : null;

  const useMp4 = videoCodec === "avc" || videoCodec === "hevc";
  const filenameExt: "mp4" | "webm" = useMp4 ? "mp4" : "webm";

  const target = new BufferTarget();
  const output = new Output({
    format: useMp4
      ? new Mp4OutputFormat({ fastStart: "in-memory" })
      : new WebMOutputFormat(),
    target,
  });

  const videoSource = new CanvasSource(opts.canvas, {
    codec: videoCodec as VideoCodec,
    quality: QUALITY_HIGH,
    keyFrameInterval: 2,
  });
  output.addVideoTrack(videoSource, { frameRate: fps });

  if (opts.title || opts.artist || opts.album) {
    output.setMetadataTags({
      title: opts.title || undefined,
      artist: opts.artist || undefined,
      album: opts.album || undefined,
    });
  }

  let audioSource: AudioBufferSource | null = null;
  if (audioBuffer && audioCodec) {
    audioSource = new AudioBufferSource({
      codec: audioCodec,
      quality: QUALITY_MEDIUM,
    });
    output.addAudioTrack(audioSource);
  }

  await output.start();

  try {
    if (audioSource && audioBuffer) {
      const padded = padAudioBuffer(
        audioBuffer,
        opts.audioPadHead ?? 0,
        opts.audioPadTail ?? 0,
      );
      await audioSource.add(padded);
      audioSource.close();
    }

    const frameDuration = 1 / fps;
    const total = Math.max(1, Math.ceil(opts.duration * fps));

    for (let i = 0; i < total; i++) {
      throwIfAborted(opts.signal);
      const t = Math.min(i * frameDuration, opts.duration);
      opts.onFrame(t);
      await videoSource.add(t, frameDuration);
      if (i % 8 === 0) {
        opts.onProgress?.({
          ratio: 0.08 + (i / total) * 0.88,
          phase: "frames",
          frame: i,
          total,
        });
      }
      if (i % 24 === 0) await yieldToUi();
    }

    videoSource.close();
    opts.onProgress?.({ ratio: 0.97, phase: "mux", frame: total, total });
    await output.finalize();
  } catch (err) {
    try {
      await output.cancel();
    } catch {
      /* ignore */
    }
    throw err;
  }

  const buffer = target.buffer;
  if (!buffer) throw new Error("輸出失敗，沒有產生檔案。");
  const blob = new Blob([buffer], {
    type: filenameExt === "mp4" ? "video/mp4" : "video/webm",
  });
  return { blob, filenameExt, hasAudio: Boolean(audioSource) };
}

function padAudioBuffer(buffer: AudioBuffer, headSec: number, tailSec: number): AudioBuffer {
  const head = Math.max(0, Math.round(headSec * buffer.sampleRate));
  const tail = Math.max(0, Math.round(tailSec * buffer.sampleRate));
  if (head === 0 && tail === 0) return buffer;
  const length = head + buffer.length + tail;
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, length, buffer.sampleRate);
  const out = ctx.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    out.copyToChannel(buffer.getChannelData(c), c, head);
  }
  return out;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

function yieldToUi() {
  return new Promise<void>((r) => setTimeout(r, 0));
}

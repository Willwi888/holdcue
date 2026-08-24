export type Step = "home" | "prelude" | "setup" | "cue" | "style" | "export";

export type AnimStyle =
  | "cinematic"
  | "karaoke"
  | "center"
  | "typewriter"
  | "lowerThird"
  | "credits";

export type Resolution = "720p" | "1080p";

export type LyricLine = {
  id: string;
  text: string;
  start: number | null;
  end: number | null;
};

export type ProjectLink = {
  id: string;
  label: string;
  url: string;
};

export type LyricFont = "sans" | "serif" | "display" | "marker" | "mono";

export type LyricSize = "s" | "m" | "l" | "xl";

export type LyricMotion = "rise" | "fade" | "slide" | "type";

export type ProjectMeta = {
  title: string;
  artist: string;
  album: string;
  subtitle: string;
  isrc: string;
  upc: string;
  releaseDate: string;
  label: string;
  lyricsText: string;
  links: ProjectLink[];
  animStyle: AnimStyle;
  resolution: Resolution;
  lyricMotion: LyricMotion;
  lyricFont: LyricFont;
  lyricSize: LyricSize;
  noiseSeconds: 2 | 3 | 5;
  showCard: boolean;
  showMeta: boolean;
  showGraffiti: boolean;
  karaokeFill: boolean;
};

export const ANIM_OPTIONS: {
  id: AnimStyle;
  label: string;
  hint: string;
}[] = [
  {
    id: "cinematic",
    label: "電影 MV",
    hint: "人像背景、專輯卡、橘色彩繪專輯名，對齊成品示意",
  },
  {
    id: "karaoke",
    label: "卡拉 OK",
    hint: "多行捲動，當句由左至右填色",
  },
  {
    id: "center",
    label: "置中淡入",
    hint: "單行置中，淡入淡出",
  },
  {
    id: "typewriter",
    label: "打字機",
    hint: "依對時長度逐字浮現",
  },
  {
    id: "lowerThird",
    label: "下三分之一",
    hint: "畫面下方資訊條，適合直式截切",
  },
  {
    id: "credits",
    label: "電影字幕",
    hint: "全詞緩緩上捲，當句高亮",
  },
];

export const MOTION_OPTIONS: {
  id: LyricMotion;
  label: string;
  hint: string;
}[] = [
  {
    id: "rise",
    label: "由下往上",
    hint: "當句從下方浮起，對齊示意成片",
  },
  {
    id: "fade",
    label: "淡入淡出",
    hint: "原地出現，柔和切換",
  },
  {
    id: "slide",
    label: "由左滑入",
    hint: "從畫面左側進入",
  },
  {
    id: "type",
    label: "打字機",
    hint: "依對時長度逐字寫出",
  },
];

export const FONT_OPTIONS: {
  id: LyricFont;
  label: string;
  hint: string;
}[] = [
  { id: "sans", label: "黑體", hint: "清楚好讀，像歌詞本" },
  { id: "serif", label: "宋體", hint: "比較像印刷詩集" },
  { id: "display", label: "標題體", hint: "海報感，適合歌名" },
  { id: "marker", label: "手寫", hint: "靠近牆上的彩繪" },
  { id: "mono", label: "月台", hint: "等寬，像車廂字幕" },
];

export const SIZE_OPTIONS: {
  id: LyricSize;
  label: string;
  scale: number;
}[] = [
  { id: "s", label: "小", scale: 0.84 },
  { id: "m", label: "中", scale: 1 },
  { id: "l", label: "大", scale: 1.24 },
  { id: "xl", label: "特大", scale: 1.5 },
];

export const RESOLUTIONS: Record<Resolution, { w: number; h: number; label: string }> = {
  "720p": { w: 1280, h: 720, label: "1280 × 720" },
  "1080p": { w: 1920, h: 1080, label: "1920 × 1080" },
};

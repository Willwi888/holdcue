import type { CatalogSongListItem } from "./catalog";

export type MetroStation = {
  slug: string;
  code: string;
  title: string;
  en: string;
  desc: string;
  lyrics: string;
  hints: string[];
};

export const METRO_STATIONS: MetroStation[] = [
  {
    slug: "empty-seat",
    code: "EM01",
    title: "空位",
    en: "Empty Seat",
    desc: "不提供座位，只提供理解。",
    lyrics:
      "有些位置本來以為會有人一直在。這首歌寫的是，那個人還在，但那個位置已經變成你不認得的樣子。",
    hints: ["空位"],
  },
  {
    slug: "memory-frame",
    code: "EM02",
    title: "回憶相框",
    en: "Memory Frame",
    desc: "遺憾可以帶上車，但不要忘記拿走。",
    lyrics: "我會學著，把回憶摺好收進相框。有些東西不是丟掉，而是學會放在一個剛好的地方。",
    hints: ["回憶相框", "相框"],
  },
  {
    slug: "not-my-happiness",
    code: "EM03",
    title: "不屬於我的幸福",
    en: "Not My Happiness",
    desc: "本列車不開往你的幸福。",
    lyrics: "不屬於我的幸福，請你慢走。是真心祝福，也是很痛的承認。",
    hints: ["不屬於我的幸福"],
  },
  {
    slug: "expired",
    code: "EM04",
    title: "過期",
    en: "Expired",
    desc: "本列車販售之座位可能已過期。",
    lyrics: "原來幸福也有保存期限。不是誰錯了，只是我們的時間剛好走散。",
    hints: ["過期"],
  },
  {
    slug: "no-goodbye",
    code: "EM05",
    title: "不告別",
    en: "No Goodbye",
    desc: "本列車不提供告別廣播。",
    lyrics: "後來我學會，和想念和平共處。有些人沒有正式說再見，但你還是得學會往前。",
    hints: ["不告別"],
  },
  {
    slug: "unworthy-pain",
    code: "EM06",
    title: "沒資格的痛",
    en: "Unworthy Pain",
    desc: "能站在這裡的人其實都已經輸過了。",
    lyrics: "連回憶都不准我留。這首歌是寫給那些連難過都不被承認的人。",
    hints: ["沒資格的痛"],
  },
  {
    slug: "leave-it-to-me",
    code: "EM07",
    title: "接下來交給我",
    en: "Leave It to Me",
    desc: "請把自己的未來交給自己。",
    lyrics: "學會在沒有你的世界裡呼吸。這裡不是痊癒，而是慢慢接手自己的開始。",
    hints: ["接下來交給我"],
  },
  {
    slug: "wae-ijeya",
    code: "EM08",
    title: "왜 이제야",
    en: "Why Only Now",
    desc: "成功換來的空位。",
    lyrics: "為什麼現在才懂？很多答案都是很晚才到，但還是值得被寫下來。",
    hints: ["왜 이제야", "為什麼現在"],
  },
  {
    slug: "goodnight-radio",
    code: "EM09",
    title: "晚安電台",
    en: "Goodnight Radio",
    desc: "提供過夜服務。退房時間：你準備好面對明天的時候。",
    lyrics: "你確定不睡嗎？明天還要上班喔。這一站比較像是一個可以暫停一下的房間。",
    hints: ["晚安電台"],
  },
];

export const METRO_RULES = [
  {
    n: "1",
    title: "本線不提供快樂餘額查詢",
    body: "一次性密碼退出後就無法使用。這裡沒有再來一次，也沒有修到完美。你現在做的就是最後的樣子。對歌詞的時候慢一點沒關係，你只是在找這一句應該落在哪裡。",
  },
  {
    n: "2",
    title: "轉乘區人潮擁擠，全面失守",
    body: "你可以下載你完成的影片。那是你陪這首歌走過的紀錄。歌曲與歌詞的權利，仍屬原創者。這裡不是授權，也不是買賣。",
  },
  {
    n: "3",
    title: "僅支援心碎感應支付",
    body: "進站請輸入一次性密碼。請將你的傷口靠近感應區。",
  },
  {
    n: "4",
    title: "請勿倚靠回憶",
    body: "音樂播完一次，就不會再播放。本班車過站，不再回頭。",
  },
  {
    n: "5",
    title: "本列車販售之座位可能已過期",
    body: "謝謝。每一個完成的版本我都心懷感謝。最好的版本，因為都是最好的版本。",
  },
];

export const METRO_FARES = [
  { from: "日常", to: "心慌", cost: "一個深呼吸" },
  { from: "心慌", to: "空位", cost: "一次已讀不回" },
  { from: "空位", to: "不屬於我的幸福", cost: "一段差一點的未來" },
];

export function matchStationSong(
  station: MetroStation,
  songs: CatalogSongListItem[],
): CatalogSongListItem | null {
  for (const hint of station.hints) {
    const hit = songs.find((s) => s.title.includes(hint) && s.hasLyrics);
    if (hit) return hit;
  }
  for (const hint of station.hints) {
    const hit = songs.find((s) => s.title.includes(hint));
    if (hit) return hit;
  }
  return null;
}

export const INTRO_SEEN_KEY = "metro-intro-seen";
export const PLAYED_KEY = "metro-played";

export function readPlayed(): string[] {
  try {
    const raw = sessionStorage.getItem(PLAYED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function markPlayed(slug: string) {
  const next = Array.from(new Set([...readPlayed(), slug]));
  sessionStorage.setItem(PLAYED_KEY, JSON.stringify(next));
}

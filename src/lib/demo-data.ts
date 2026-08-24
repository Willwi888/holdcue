import { uid } from "./utils";
import type { LyricLine, ProjectLink } from "./types";

export const DEMO_AUDIO = "/demo/audio.mp3";
export const DEMO_COVER = "/demo/cover.jpg";
export const DEMO_PORTRAIT = "/demo/portrait.jpg";
export const DEMO_AUDIO_DURATION = 168;

export const DEMO_LYRICS = `我愛的你 讓世界為你停止
思念還未到 就要先告別
我的城市裡 現在還在下著雪
你默默把外套 收進衣櫃最裡面
假裝這樣就能 隔絕所有思念

我想說我也是 你沒有接聽
空氣安靜得 只剩沉默在回答
時間還沒到 就已經先告別
時間是賊 偷走我們 說好的章節

你走的那條路 我還沒走
就怕踩痛我們 從前的溫柔
我寫的那些字 如同遺墨
怕認出當時 認真的筆觸

我說的再見 你也不捨得說
像斷線的風箏 只能看它飄走
你站在原地 揮著手
對著即將 還沒發生的以後

我們在幸福來臨前 就先學會分手
在擁抱冷卻前 就先放開手
雨還沒下 就先淋濕眼眸
路還沒走 就先看見盡頭

我們在承諾說出前 就先選擇沉默
天還沒亮 就先說破
歌還沒寫完 就先唱完寂寞
而你和我 還沒開始 就已經結束了

你說的再見 我終於學會沉默
像落葉告別枝頭 無聲地墜落
我站在這裡 目送著
一個從來 不屬於我的夢

我們在幸福來臨前 就先學會分手
在擁抱冷卻前 就先放開手
雨還沒下 就先淋濕眼眸
路還沒走 就先看見盡頭

我們在承諾說出前 就先選擇沉默
天還沒亮 就先說破
歌還沒寫完 就先唱完寂寞
而你和我 還沒開始 就已經結束了

原諒你 沒能陪我走過 那個冬天
謝謝你 讓我懂了 放手也是一種獲得
我們在幸福來臨前 就先學會分手
那句未說的再見 我不急著說了`;

export function parseLyrics(text: string): LyricLine[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      id: uid("ln"),
      text: line,
      start: null,
      end: null,
    }));
}

export function applyEvenTiming(
  lines: LyricLine[],
  duration = DEMO_AUDIO_DURATION,
): LyricLine[] {
  if (lines.length === 0) return lines;
  const intro = Math.min(6, duration * 0.04);
  const outro = Math.min(10, duration * 0.06);
  const usable = Math.max(duration - intro - outro, lines.length * 1.2);
  const slot = usable / lines.length;
  const hold = Math.min(slot * 0.86, slot - 0.18);
  return lines.map((line, i) => {
    const start = intro + i * slot;
    const end = Math.min(start + hold, duration - outro * 0.2);
    return { ...line, start, end };
  });
}

export const DEMO_LINKS: ProjectLink[] = [
  { id: "link-yt", label: "YouTube", url: "" },
  { id: "link-sp", label: "Spotify", url: "" },
  { id: "link-am", label: "Apple Music", url: "" },
];

export const DEMO_META = {
  title: "空位",
  artist: "Willwi",
  album: "HEART BREAK",
  subtitle: "你織的圍巾 還繞著我的寂寞",
  isrc: "",
  upc: "825324577508",
  releaseDate: "2026-05-15",
  label: "Willwi Music",
  lyricsText: DEMO_LYRICS,
};

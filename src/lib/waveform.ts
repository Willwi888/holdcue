export async function computePeaks(
  url: string,
  bars = 160,
): Promise<number[]> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(buf.slice(0));
    const channel = audio.getChannelData(0);
    const size = Math.floor(channel.length / bars) || 1;
    const peaks: number[] = [];
    for (let i = 0; i < bars; i++) {
      let sum = 0;
      const start = i * size;
      const end = Math.min(start + size, channel.length);
      for (let j = start; j < end; j += 8) sum += Math.abs(channel[j] ?? 0);
      peaks.push(sum / Math.max(1, (end - start) / 8));
    }
    const max = Math.max(...peaks, 0.0001);
    return peaks.map((p) => p / max);
  } finally {
    await ctx.close();
  }
}

export async function decodeAudio(url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(buf.slice(0));
  } finally {
    await ctx.close();
  }
}

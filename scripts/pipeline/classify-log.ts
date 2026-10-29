export type DayStats = { day: string; close: number; votes: number; afterClose: number; queue: number; afterGap: number; after49: number; firstGapAt: number | null; lastVote: number | null };

const GAP = 5;

export function classifyDay(text: string, day: string): DayStats | null {
  const times: number[] = [];
  let open: number | null = null;
  for (const line of text.split("\n")) {
    if (!line.startsWith(day)) continue;
    const t = +line.slice(11, 13) * 60 + +line.slice(14, 16) + +line.slice(17, 19) / 60;
    if (open === null && line.includes("Urna pronta para receber votos")) open = t;
    if (line.includes("O voto do eleitor foi computado")) times.push(t);
  }
  if (!times.length) return null;
  times.sort((a, b) => a - b);
  open ??= times[0];
  const close = (Math.round(open / 60) + 9) * 60;
  let prev = times.filter((t) => t <= close).at(-1) ?? close;
  if (close - prev > GAP) prev = close;
  let queue = 0, afterGap = 0, after49 = 0, firstGapAt: number | null = null;
  for (const t of times) {
    if (t <= close) continue;
    if (t - close >= 49) after49++;
    if (firstGapAt === null && t - prev > GAP) firstGapAt = prev - close;
    if (firstGapAt === null) queue++;
    else afterGap++;
    prev = t;
  }
  return { day, close, votes: times.length, afterClose: queue + afterGap, queue, afterGap, after49, firstGapAt, lastVote: times.at(-1)! - close };
}

if (import.meta.main) {
  const text = await Bun.file(process.argv[2]).text();
  for (const day of process.argv.slice(3)) console.log(classifyDay(text, day));
}

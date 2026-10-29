import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const BASE = "https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna/3221/dados";
const LIST = process.env.LIST ?? "data/extended-sections.json";
const OUT = process.env.OUT ?? "data/late-votes.ndjson";
const DELAY = Number(process.env.DELAY ?? "600");
const GAP = 5;

const offsets = new Map<string, number>();
{
  const hours = new Map<string, Map<number, number>>();
  for (const l of readFileSync("data/r1/sec.ndjson", "utf8").split("\n")) {
    if (!l) continue;
    const s = JSON.parse(l);
    const m = String(s.open ?? "").match(/ (\d{2}):(\d{2})/);
    if (!m || s.uf === "zz") continue;
    const h = Math.round((+m[1] * 60 + +m[2]) / 60);
    const c = hours.get(s.mun) ?? new Map<number, number>();
    c.set(h, (c.get(h) ?? 0) + 1);
    hours.set(s.mun, c);
  }
  for (const [mun, c] of hours) offsets.set(mun, [...c].sort((a, b) => b[1] - a[1])[0][0] - 8);
}

async function get(url: string, kind: "json" | "bin"): Promise<any> {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { headers: { "User-Agent": "research-script (election analysis)" } });
    if (r.status === 404) return null;
    if (r.status === 429 || r.status >= 500) { console.log(`status ${r.status}, pause 90s`); await Bun.sleep(90_000); continue; }
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    await Bun.sleep(DELAY);
    return kind === "json" ? r.json() : new Uint8Array(await r.arrayBuffer());
  }
}

export function measure(text: string, offsetH: number) {
  const toBsb = (line: string) => +line.slice(11, 13) * 60 + +line.slice(14, 16) + +line.slice(17, 19) / 60 - offsetH * 60;
  const lines = text.split("\n").filter((l) => l.startsWith("25/10/2026"));
  const votes = lines.filter((l) => l.includes("O voto do eleitor foi computado")).map(toBsb).sort((a, b) => a - b);
  const closes = lines.filter((l) => l.includes("Procedimento de encerramento confirmado")).map(toBsb);
  const close = closes.length ? Math.max(...closes) : null;
  const OFFICIAL = 17 * 60;
  let prev = votes.filter((t) => t <= OFFICIAL).at(-1) ?? OFFICIAL;
  if (OFFICIAL - prev > GAP) prev = OFFICIAL;
  let queue = 0, afterGap = 0, gapStarted = false;
  const late: number[] = [];
  for (const t of votes) {
    if (t <= OFFICIAL) continue;
    if (!gapStarted && t - prev > GAP) gapStarted = true;
    if (gapStarted) afterGap++; else queue++;
    late.push(Math.round((t - OFFICIAL) * 10) / 10);
    prev = t;
  }
  return { votes: votes.length, close_bsb: close == null ? null : Math.round(close * 10) / 10, after_17: late.length, queue, after_gap: afterGap, after_1749: late.filter((m) => m >= 49).length, late_minutes: late };
}

if (import.meta.main) {
  const list: { uf: string; mun: string; zon: string; sec: string }[] = JSON.parse(readFileSync(LIST, "utf8"));
  const done = new Set(existsSync(OUT) ? readFileSync(OUT, "utf8").trim().split("\n").filter(Boolean).map((l) => { const j = JSON.parse(l); return `${j.uf}/${j.mun}/${j.zon}/${j.sec}`; }) : []);
  const todo = list.filter((s) => !done.has(`${s.uf}/${s.mun}/${s.zon}/${s.sec}`));
  console.log(`list ${list.length}, todo ${todo.length}`);
  let n = 0;
  for (const s of todo) {
    const dir = `${BASE}/${s.uf}/${s.mun}/${s.zon}/${s.sec}`;
    const row: Record<string, unknown> = { ...s };
    const aux = await get(`${dir}/p003221-${s.uf}-m${s.mun}-z${s.zon}-s${s.sec}-aux.json`, "json");
    const h = aux?.hashes?.at(-1), lg = h?.arq?.find((a: any) => a.tp === "log")?.nm;
    if (!lg) row.error = "no log";
    else {
      const zip = await get(`${dir}/${h.hash}/${lg}`, "bin");
      const tmp = `${tmpdir()}/late-${process.pid}.jez`;
      writeFileSync(tmp, zip);
      const text = new TextDecoder("latin1").decode(Bun.spawnSync(["bsdtar", "-xOf", tmp]).stdout);
      Object.assign(row, { offset_h: offsets.get(s.mun) ?? 0 }, measure(text, offsets.get(s.mun) ?? 0));
    }
    appendFileSync(OUT, JSON.stringify(row) + "\n");
    if (++n % 500 === 0) console.log(`${n}/${todo.length}`);
  }
  console.log("late votes finished");
}

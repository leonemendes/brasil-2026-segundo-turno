import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const NOTIFY = 49;
const BIN = 5, START = -30, END = 180;

type Sec = { uf: string; mun: string; zon: string; sec: string; open?: string; close?: string; aptos?: number; comp?: number; c13?: number; c22?: number; other?: number; branco?: number; nulo?: number };
type Agg = { sec: number; comp: number; c13: number; c22: number };
const z = (): Agg => ({ sec: 0, comp: 0, c13: 0, c22: 0 });
const add = (a: Agg, s: Sec) => { a.sec++; a.comp += s.comp ?? 0; a.c13 += s.c13 ?? 0; a.c22 += s.c22 ?? 0; };
const key = (s: Sec) => `${s.uf}/${s.mun}/${s.zon}/${s.sec}`;

const minutes = (s?: string) => {
  const m = s?.match(/(\d{4})-?(\d{2})-?(\d{2})[T ](\d{2}):?(\d{2}):?(\d{2})/) ?? s?.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
  return m ? +m[4] * 60 + +m[5] + +m[6] / 60 : null;
};

function afterClose(rows: Sec[]) {
  const hours = new Map<string, Map<number, number>>();
  for (const s of rows) {
    const o = minutes(s.open);
    if (o === null) continue;
    const m = hours.get(s.mun) ?? new Map<number, number>();
    const h = Math.round(o / 60);
    m.set(h, (m.get(h) ?? 0) + 1);
    hours.set(s.mun, m);
  }
  const closeAt = new Map<string, number>();
  for (const [mun, m] of hours) closeAt.set(mun, ([...m].sort((a, b) => b[1] - a[1])[0][0] + 9) * 60);
  return (s: Sec) => {
    const c = minutes(s.close);
    return c === null || s.uf === "zz" || !closeAt.has(s.mun) ? null : c - closeAt.get(s.mun)!;
  };
}

const sets = {
  b18: read("data/b18/sec.ndjson") as Sec[],
  b22: read("data/b22/sec.ndjson") as Sec[],
  r1: read("data/r1/sec.ndjson") as Sec[],
  r2: (read("data/r2sec/all.ndjson") as Sec[]).filter((s) => s.c13 !== undefined),
};
const phase2 = sets.r2.length > 400_000;

const hist = Array.from({ length: (END - START) / BIN }, (_, i) => ({ t: START + i * BIN, b18: 0, b22: 0, r1: 0, r2: 0 }));
const late: Record<string, Record<string, { n: number; queue: number; late: number }>> = {};
const rel: Record<string, Map<string, number | null>> = {};
for (const [name, rows] of Object.entries(sets)) {
  const f = afterClose(rows);
  rel[name] = new Map();
  for (const s of rows) {
    const m = f(s);
    rel[name].set(key(s), m);
    if (m === null) continue;
    hist[Math.floor((Math.min(Math.max(m, START), END - 1) - START) / BIN)][name as "r1"]++;
    const u = ((late[name] ??= {})[s.uf] ??= { n: 0, queue: 0, late: 0 });
    u.n++;
    if (m >= NOTIFY) u.late++;
    else if (m > 1) u.queue++;
  }
}

const total = z(), queue = z(), extended = z(), habitual = z();
const byUf: Record<string, { all: Agg; queue: Agg; ext: Agg }> = {};
const byMun: Record<string, { ext: number; extComp: number; queue: number; n: number }> = {};
const lateList: { k: string; m: number }[] = [];
for (const s of sets.r2) {
  add(total, s);
  const u = (byUf[s.uf] ??= { all: z(), queue: z(), ext: z() });
  add(u.all, s);
  const mm = (byMun[s.mun] ??= { ext: 0, extComp: 0, queue: 0, n: 0 });
  mm.n++;
  const m = rel.r2.get(key(s));
  if (m == null) continue;
  if (m >= NOTIFY) {
    add(extended, s); add(u.ext, s); mm.ext++; mm.extComp += s.comp ?? 0;
    lateList.push({ k: key(s), m });
    const prev = rel.b22.get(key(s));
    if (prev != null && prev >= 30) add(habitual, s);
  } else if (m > 1) { add(queue, s); add(u.queue, s); mm.queue++; }
}

const share = (a: Agg) => (a.c13 + a.c22 ? (a.c13 / (a.c13 + a.c22)) * 100 : 0);
const minus = (a: Agg, b: Agg): Agg => ({ sec: a.sec - b.sec, comp: a.comp - b.comp, c13: a.c13 - b.c13, c22: a.c22 - b.c22 });
const summary = phase2 ? {
  r2Sections: sets.r2.length, total, queue, extended, habitual,
  lulaPct: share(total), lulaPctInExtended: share(extended), lulaPctInQueue: share(queue),
  lulaPctWithoutExtended: share(minus(total, extended)),
  margin: total.c13 - total.c22,
  marginWithoutExtended: minus(total, extended).c13 - minus(total, extended).c22,
} : null;

mkdirSync("out", { recursive: true });
writeFileSync("out/sections.json", JSON.stringify({ phase2, summary, hist, late, byUf, byMun }));
writeFileSync("out/late-sections.json", JSON.stringify(lateList));
const nat = (n: string) => Object.values(late[n] ?? {}).reduce((a, u) => ({ n: a.n + u.n, queue: a.queue + u.queue, late: a.late + u.late }), { n: 0, queue: 0, late: 0 });
for (const n of Object.keys(sets)) console.log(n, JSON.stringify(nat(n)));
if (summary) console.log(JSON.stringify(summary, null, 1));

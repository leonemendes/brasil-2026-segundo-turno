import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const cm = JSON.parse(readFileSync("data/mun-cm.json", "utf8"));
const ibgeOf = new Map<string, string>();
const nameOf = new Map<string, string>();
for (const a of cm.abr) for (const m of a.mu) { ibgeOf.set(m.cd, m.cdi); nameOf.set(m.cd, m.nm); }

type T = { L: number; F: number; O: number; B: number; N: number; comp: number; aptos: number };
const z = (): T => ({ L: 0, F: 0, O: 0, B: 0, N: 0, comp: 0, aptos: 0 });
const addSec = (t: T, s: any) => { t.L += s.c13 ?? 0; t.F += s.c22 ?? 0; t.O += s.other ?? 0; t.B += s.branco ?? 0; t.N += s.nulo ?? 0; t.comp += s.comp ?? 0; t.aptos += s.aptos ?? 0; };

const r1Mun = new Map<string, T>(), r1Uf = new Map<string, T>(), r1Br = z();
for (const s of read("data/r1/sec.ndjson")) {
  if (!r1Mun.has(s.mun)) r1Mun.set(s.mun, z());
  if (!r1Uf.has(s.uf)) r1Uf.set(s.uf, z());
  addSec(r1Mun.get(s.mun)!, s); addSec(r1Uf.get(s.uf)!, s); addSec(r1Br, s);
}

const aggMun = (p: string) => { const m = new Map<string, [number, number]>(); for (const r of read(p)) { const v = m.get(r.mun) ?? [0, 0]; v[0] += r.c13; v[1] += r.c22; m.set(r.mun, v); } return m; };
const m18 = aggMun("data/b18/sec.ndjson"), m22 = aggMun("data/b22/sec.ndjson");

const r2SecRows = read("data/r2sec/all.ndjson");
const r2Mun = new Map<string, T>();
if (r2SecRows.length) {
  for (const s of r2SecRows) { if (!r2Mun.has(s.mun)) r2Mun.set(s.mun, z()); addSec(r2Mun.get(s.mun)!, s); }
} else {
  for (const m of read("data/r2-mun.ndjson")) r2Mun.set(m.mun, { L: m.c13, F: m.c22, O: 0, B: m.branco, N: m.nulo, comp: m.comp, aptos: m.aptos });
}
const r2UfRaw = JSON.parse(readFileSync("data/r2-uf.json", "utf8"));

const sections = existsSync("out/sections.json") ? JSON.parse(readFileSync("out/sections.json", "utf8")) : null;
const phase2 = !!sections?.phase2;

const mun: any[] = [];
for (const [cd, t1] of r1Mun) {
  const ibge = ibgeOf.get(cd);
  if (!ibge) continue;
  const t2 = r2Mun.get(cd);
  const ext = phase2 ? sections?.byMun?.[cd] : null;
  mun.push([ibge, nameOf.get(cd), t1.L, t1.F, t1.L + t1.F + t1.O, t1.comp, t1.aptos, t2?.L ?? null, t2?.F ?? null, t2?.comp ?? null, ext?.ext ?? null, ext?.extComp ?? null, ...(m18.get(cd) ?? [null, null]), ...(m22.get(cd) ?? [null, null])]);
}

const ufCache = new Map<string, Map<string, [number, number]>>();
const ufAgg = (p: string, uf: string) => { if (!ufCache.has(p)) { const m = new Map<string, [number, number]>(); for (const r of read(p)) { const v = m.get(r.uf) ?? [0, 0]; v[0] += r.c13; v[1] += r.c22; m.set(r.uf, v); } ufCache.set(p, m); } return ufCache.get(p)!.get(uf) ?? null; };
const ufs = [...r1Uf.keys()].sort().map((uf) => {
  const a = r1Uf.get(uf)!, b = r2UfRaw[uf];
  return { uf, r1: { L: a.L, F: a.F, valid: a.L + a.F + a.O, comp: a.comp, aptos: a.aptos }, r2: b ? { L: b.c13, F: b.c22, comp: b.comp, aptos: b.aptos } : null, ext: phase2 ? sections.byUf[uf]?.ext ?? null : null, late: { b18: sections?.late?.b18?.[uf] ?? null, b22: sections?.late?.b22?.[uf] ?? null, r1: sections?.late?.r1?.[uf] ?? null, r2: phase2 ? sections?.late?.r2?.[uf] ?? null : null }, y18: ufAgg("data/b18/sec.ndjson", uf), y22: ufAgg("data/b22/sec.ndjson", uf) };
});

const br2 = r2UfRaw.br;
const out = {
  generated: new Date().toISOString(),
  phase: phase2 ? 2 : 1,
  r2MunCount: r2Mun.size,
  national: {
    r1: { L: r1Br.L, F: r1Br.F, valid: r1Br.L + r1Br.F + r1Br.O, comp: r1Br.comp, aptos: r1Br.aptos },
    r2: { L: br2.c13, F: br2.c22, comp: br2.comp, aptos: br2.aptos, B: br2.branco, N: br2.nulo },
  },
  ufs,
  mun,
  hist: sections?.hist ?? null,
  late: sections ? Object.fromEntries(Object.entries(sections.late).map(([k, v]: any) => [k, Object.values(v).reduce((a: any, u: any) => ({ n: a.n + u.n, queue: a.queue + u.queue, late: a.late + u.late }), { n: 0, queue: 0, late: 0 })])) : null,
  y18: [...m18.values()].reduce((a, v) => [a[0] + v[0], a[1] + v[1]], [0, 0]),
  y22: [...m22.values()].reduce((a, v) => [a[0] + v[0], a[1] + v[1]], [0, 0]),
  summary: phase2 ? sections.summary : null,
  timeline: JSON.parse(readFileSync("timeline.json", "utf8")),
};
mkdirSync("site", { recursive: true });
writeFileSync("site/data.json", JSON.stringify(out));
console.log(`phase ${out.phase}, mun ${mun.length}, r2 mun ${r2Mun.size}, bytes ${JSON.stringify(out).length}`);

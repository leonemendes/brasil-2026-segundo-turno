import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";

type Sec = { uf: string; mun: string; zon: string; sec: string; open: string; close: string; recv?: string; c13: number; c22: number };
type Row = { key: string; uf: string; mun: string; l: number; r: number; recv: number | null; close: number | null };

const REGION: Record<string, string> = {
  ac: "N", am: "N", ap: "N", pa: "N", ro: "N", rr: "N", to: "N",
  al: "NE", ba: "NE", ce: "NE", ma: "NE", pb: "NE", pe: "NE", pi: "NE", rn: "NE", se: "NE",
  df: "CO", go: "CO", ms: "CO", mt: "CO",
  es: "SE", mg: "SE", rj: "SE", sp: "SE",
  pr: "S", rs: "S", sc: "S",
  zz: "ZZ",
};
const REGIONS = ["N", "NE", "CO", "SE", "S", "ZZ"];
const GRID = 500;
const SHUFFLES = 200;
const SAMPLE = 472;
const SAMPLES = 20;

const load = (f: string): Sec[] => gunzipSync(readFileSync(f)).toString().trim().split("\n").map((l) => JSON.parse(l));

const minutes = (t?: string) => {
  if (!t) return null;
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/) ?? t.match(/^(\d{4})-(\d{2})-(\d{2})[ T]?(\d{2}):?(\d{2})/);
  if (!m) return null;
  const [d, h, mi] = t.includes("/") ? [+m[1], +m[4], +m[5]] : [+m[3], +m[4], +m[5]];
  return d * 1440 + h * 60 + mi;
};

const tzOffsets = (secs: Sec[]) => {
  const hours = new Map<string, Map<number, number>>();
  for (const s of secs) {
    const o = minutes(s.open);
    if (o === null || s.uf === "zz") continue;
    const h = Math.floor((o % 1440) / 60);
    const m = hours.get(s.mun) ?? new Map<number, number>();
    m.set(h, (m.get(h) ?? 0) + 1);
    hours.set(s.mun, m);
  }
  const off = new Map<string, number>();
  for (const [mun, m] of hours) off.set(mun, (8 - [...m].sort((a, b) => b[1] - a[1])[0][0]) * 60);
  return off;
};

const rows = (secs: Sec[], off: Map<string, number>): Row[] =>
  secs.map((s) => {
    const c = minutes(s.close);
    const o = off.get(s.mun);
    return {
      key: `${s.uf}/${s.mun}/${s.zon}/${s.sec}`, uf: s.uf, mun: s.mun, l: s.c13, r: s.c22,
      recv: minutes(s.recv),
      close: c === null || o === undefined || s.uf === "zz" ? null : c + o,
    };
  });

const curve = (ordered: Row[]) => {
  const n = ordered.length;
  const out: [number, number][] = [];
  let l = 0, r = 0, next = 0;
  for (let i = 0; i < n; i++) {
    l += ordered[i].l; r += ordered[i].r;
    const p = (i + 1) / n;
    if (p >= next / GRID || i === n - 1) {
      out.push([+(p * 100).toFixed(2), +((100 * r) / (l + r || 1)).toFixed(3)]);
      next = Math.floor(p * GRID) + 1;
    }
  }
  return out;
};

let seed = 20261025;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const shuffle = <T>(a: T[]) => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};

const sharesAtGrid = (ordered: Row[]) => {
  const n = ordered.length;
  const out = new Float64Array(GRID);
  let l = 0, r = 0, g = 0;
  for (let i = 0; i < n && g < GRID; i++) {
    l += ordered[i].l; r += ordered[i].r;
    while (g < GRID && i + 1 >= Math.ceil(((g + 1) / GRID) * n)) out[g++] = (100 * r) / (l + r || 1);
  }
  return out;
};

const randomBand = (rs: Row[]) => {
  const runs = Array.from({ length: SHUFFLES }, () => sharesAtGrid(shuffle(rs)));
  return Array.from({ length: GRID }, (_, g) => {
    const v = runs.map((x) => x[g]).sort((a, b) => a - b);
    return [+(((g + 1) / GRID) * 100).toFixed(2), +v[Math.floor(0.025 * SHUFFLES)].toFixed(3), +v[Math.ceil(0.975 * SHUFFLES) - 1].toFixed(3)];
  });
};

const byTime = (rs: Row[], f: "recv" | "close") =>
  shuffle(rs.filter((x) => x[f] !== null)).sort((a, b) => a[f]! - b[f]!);

const bins = (rs: Row[], f: "recv" | "close", width = 15) => {
  const m = new Map<number, Record<string, { l: number; r: number; n: number }>>();
  for (const x of rs) {
    if (x[f] === null) continue;
    const b = Math.floor(x[f]! / width) * width;
    const rec = m.get(b) ?? {};
    const g = (rec[REGION[x.uf]] ??= { l: 0, r: 0, n: 0 });
    g.l += x.l; g.r += x.r; g.n++;
    m.set(b, rec);
  }
  return [...m.keys()].sort((a, b) => a - b).map((b) => {
    const rec = m.get(b)!;
    const tot = Object.values(rec).reduce((a, g) => ({ l: a.l + g.l, r: a.r + g.r, n: a.n + g.n }), { l: 0, r: 0, n: 0 });
    return {
      t: `${String(Math.floor((b % 1440) / 60)).padStart(2, "0")}:${String(b % 60).padStart(2, "0")}`,
      day: Math.floor(b / 1440),
      n: tot.n, share: +((100 * tot.r) / (tot.l + tot.r || 1)).toFixed(2),
      regions: Object.fromEntries(REGIONS.filter((k) => rec[k]).map((k) => [k, rec[k].n])),
    };
  });
};

const total = (rs: Row[]) => {
  const l = rs.reduce((a, x) => a + x.l, 0), r = rs.reduce((a, x) => a + x.r, 0);
  return { left: l, right: r, share: +((100 * r) / (l + r)).toFixed(3), sections: rs.length };
};

const regionShares = (rs: Row[]) =>
  Object.fromEntries(REGIONS.map((k) => {
    const sub = rs.filter((x) => REGION[x.uf] === k);
    const l = sub.reduce((a, x) => a + x.l, 0), r = sub.reduce((a, x) => a + x.r, 0);
    return [k, { share: +((100 * r) / (l + r)).toFixed(2), sections: sub.length }];
  }));

const munShares = (rs: Row[]) => {
  const m = new Map<string, { l: number; r: number }>();
  for (const x of rs) {
    const k = `${x.uf}/${x.mun}`;
    const g = m.get(k) ?? { l: 0, r: 0 };
    g.l += x.l; g.r += x.r; m.set(k, g);
  }
  return m;
};

const s18 = load("data/sections/2018-runoff.ndjson.gz");
const s22 = load("data/sections/2022-runoff.ndjson.gz");
const s26 = load("data/sections/2026-runoff.ndjson.gz");
const off22 = tzOffsets(s22);
const off26 = tzOffsets(s26);
const r18 = rows(s18, off22);
const r22 = rows(s22, off22);
const r26 = rows(s26, off26);

const year = (rs: Row[], hasRecv: boolean) => {
  const recv = hasRecv ? byTime(rs, "recv") : null;
  const close = byTime(rs, "close");
  const shuffled = shuffle(rs);
  return {
    total: total(rs),
    regions: regionShares(rs),
    recv: recv && curve(recv),
    close: curve(close),
    closeCoverage: +((100 * close.length) / rs.length).toFixed(2),
    random: curve(shuffled),
    band: randomBand(rs),
    bins: bins(rs, hasRecv ? "recv" : "close"),
  };
};

const idx18 = new Map(r18.map((x) => [x.key, x]));
const idx22 = new Map(r22.map((x) => [x.key, x]));
const matched = byTime(r26.filter((x) => idx22.has(x.key) && idx18.has(x.key)), "recv")
  .map((x) => ({ a: idx18.get(x.key)!, b: idx22.get(x.key)!, c: x }));

const m18 = munShares(r18), m22 = munShares(r22), m26 = munShares(r26);
const names = new Map(s26.map((s) => [`${s.uf}/${s.mun}`, (s as Sec & { nm: string }).nm]));
const scatter = [...m22.keys()].filter((k) => m26.has(k) && !k.startsWith("zz")).map((k) => {
  const s = (g?: { l: number; r: number }) => (g && g.l + g.r ? +((100 * g.r) / (g.l + g.r)).toFixed(1) : null);
  return [s(m18.get(k)), s(m22.get(k)), s(m26.get(k)), m22.get(k)!.l + m22.get(k)!.r, `${names.get(k)} (${k.slice(0, 2).toUpperCase()})`];
});
const corr = (pairs: [number, number][]) => {
  const n = pairs.length, mx = pairs.reduce((a, p) => a + p[0], 0) / n, my = pairs.reduce((a, p) => a + p[1], 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pairs) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  return +(sxy / Math.sqrt(sxx * syy)).toFixed(4);
};

const samples = Array.from({ length: SAMPLES }, () => {
  const pick = shuffle(r26).slice(0, SAMPLE);
  let l = 0, r = 0;
  return pick.map((x) => { l += x.l; r += x.r; return +((100 * r) / (l + r || 1)).toFixed(2); });
});

const out = {
  y2018: year(r18, false),
  y2022: year(r22, true),
  y2026: year(r26, true),
  sameOrder: { matched: matched.length, of2026: r26.length, y2018: curve(matched.map((m) => m.a)), y2022: curve(matched.map((m) => m.b)), y2026: curve(matched.map((m) => m.c)) },
  scatter,
  corr: {
    r22_26: corr(scatter.filter((p) => p[1] !== null && p[2] !== null).map((p) => [p[1]!, p[2]!])),
    r18_22: corr(scatter.filter((p) => p[0] !== null && p[1] !== null).map((p) => [p[0]!, p[1]!])),
  },
  samples472: samples,
};
writeFileSync(process.argv[2] ?? "ds/count_order.json", JSON.stringify(out));
console.log(JSON.stringify({
  totals: [out.y2018.total, out.y2022.total, out.y2026.total],
  closeCoverage: [out.y2018.closeCoverage, out.y2022.closeCoverage, out.y2026.closeCoverage],
  matched: out.sameOrder.matched, corr: out.corr,
  regions: [out.y2018.regions, out.y2022.regions, out.y2026.regions],
}, null, 1));

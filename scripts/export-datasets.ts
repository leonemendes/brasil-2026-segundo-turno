import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { geoArea, geoMercator, geoPath, geoProjection } from "d3-geo";
import { feature, mesh, merge } from "topojson-client";

const OUT = "ds";
mkdirSync(OUT, { recursive: true });
const d = JSON.parse(readFileSync("site/data.json", "utf8"));
const save = (name: string, rows: unknown[]) => { writeFileSync(`${OUT}/${name}.json`, JSON.stringify(rows)); console.log(name, rows.length, readFileSync(`${OUT}/${name}.json`).length); };
const UF_NAMES: Record<string, string> = { ac: "Acre", al: "Alagoas", am: "Amazonas", ap: "Amapá", ba: "Bahia", ce: "Ceará", df: "Distrito Federal", es: "Espírito Santo", go: "Goiás", ma: "Maranhão", mg: "Minas Gerais", ms: "Mato Grosso do Sul", mt: "Mato Grosso", pa: "Pará", pb: "Paraíba", pe: "Pernambuco", pi: "Piauí", pr: "Paraná", rj: "Rio de Janeiro", rn: "Rio Grande do Norte", ro: "Rondônia", rr: "Roraima", rs: "Rio Grande do Sul", sc: "Santa Catarina", se: "Sergipe", sp: "São Paulo", to: "Tocantins", zz: "Abroad" };
const IBGE_UF: Record<string, string> = { 11: "ro", 12: "ac", 13: "am", 14: "rr", 15: "pa", 16: "ap", 17: "to", 21: "ma", 22: "pi", 23: "ce", 24: "rn", 25: "pb", 26: "pe", 27: "al", 28: "se", 29: "ba", 31: "mg", 32: "es", 33: "rj", 35: "sp", 41: "pr", 42: "sc", 43: "rs", 50: "ms", 51: "mt", 52: "go", 53: "df" };
const title = (s: string) => s.toLowerCase().replace(/(^|[\s-])(\S)/g, (_m, a, b) => a + b.toUpperCase()).replace(/ (D[aeo]s?|E) /g, (m) => m.toLowerCase());

save("municipalities", d.mun.map((r: any[]) => ({
  ibge: r[0], uf: IBGE_UF[r[0].slice(0, 2)], name: title(r[1]),
  r1_lula: r[2], r1_flavio: r[3], r1_valid: r[4], r1_turnout: r[5], electorate: r[6],
  r2_lula: r[7], r2_flavio: r[8], r2_turnout: r[9],
  y2018_haddad: r[12], y2018_bolsonaro: r[13], y2022_lula: r[14], y2022_bolsonaro: r[15],
  sections_late: r[10], voters_late_sections: r[11],
})));

save("states", d.ufs.filter((u: any) => u.uf !== "zz").map((u: any) => ({
  uf: u.uf, state: UF_NAMES[u.uf],
  r1_lula: u.r1.L, r1_flavio: u.r1.F, r1_valid: u.r1.valid, r1_turnout: u.r1.comp, r1_electorate: u.r1.aptos,
  r2_lula: u.r2?.L ?? null, r2_flavio: u.r2?.F ?? null, r2_turnout: u.r2?.comp ?? null, r2_electorate: u.r2?.aptos ?? null,
  y2018_haddad: u.y18?.[0] ?? null, y2018_bolsonaro: u.y18?.[1] ?? null, y2022_lula: u.y22?.[0] ?? null, y2022_bolsonaro: u.y22?.[1] ?? null,
  late_2018: u.late.b18?.late ?? null, sections_2018: u.late.b18?.n ?? null,
  late_2022: u.late.b22?.late ?? null, sections_2022: u.late.b22?.n ?? null,
  late_2026_r1: u.late.r1?.late ?? null, sections_2026_r1: u.late.r1?.n ?? null,
  late_2026_r2: u.late.r2?.late ?? null, sections_2026_r2: u.late.r2?.n ?? null,
})));

const n = d.national;
const zzSum = (p: string) => { let L = 0, F = 0, V = 0; for (const l of readFileSync(p, "utf8").split("\n")) { if (!l.includes("\"uf\":\"zz\"")) continue; const r = JSON.parse(l); L += r.c13; F += r.c22; V += r.c13 + r.c22 + (r.other ?? 0); } return { L, F, V }; };
const a18 = zzSum("data/b18/sec.ndjson"), a22 = zzSum("data/b22/sec.ndjson"), a1 = zzSum("data/r1/sec.ndjson"), a2 = JSON.parse(readFileSync("data/r2-uf.json", "utf8")).zz;
save("national", [
  { election: "2018 runoff, abroad", key: "abroad_y2018", left_name: "Haddad", right_name: "Jair Bolsonaro", left: a18.L, right: a18.F, valid: a18.V },
  { election: "2022 runoff, abroad", key: "abroad_y2022", left_name: "Lula", right_name: "Jair Bolsonaro", left: a22.L, right: a22.F, valid: a22.V },
  { election: "2026 round 1, abroad", key: "abroad_r1", left_name: "Lula", right_name: "Flávio Bolsonaro", left: a1.L, right: a1.F, valid: a1.V },
  { election: "2026 runoff, abroad", key: "abroad_r2", left_name: "Lula", right_name: "Flávio Bolsonaro", left: a2.c13, right: a2.c22, valid: a2.c13 + a2.c22 },
  { election: "2018 runoff", key: "y2018", left_name: "Haddad", right_name: "Jair Bolsonaro", left: d.y18[0], right: d.y18[1], valid: d.y18[0] + d.y18[1] },
  { election: "2022 runoff", key: "y2022", left_name: "Lula", right_name: "Jair Bolsonaro", left: d.y22[0], right: d.y22[1], valid: d.y22[0] + d.y22[1] },
  { election: "2026 round 1", key: "r1", left_name: "Lula", right_name: "Flávio Bolsonaro", left: n.r1.L, right: n.r1.F, valid: n.r1.valid },
  { election: "2026 runoff", key: "r2", left_name: "Lula", right_name: "Flávio Bolsonaro", left: n.r2.L, right: n.r2.F, valid: n.r2.L + n.r2.F },
]);

const curves: any[] = [];
const names: Record<string, string> = { b18: "2018 runoff", b22: "2022 runoff", r1: "2026 round 1", r2: "2026 runoff" };
for (const k of Object.keys(names)) {
  const total = d.hist.reduce((a: number, b: any) => a + b[k], 0);
  if (!total) continue;
  let rem = total;
  for (const b of d.hist) { curves.push({ election: names[k], minute: b.t, still_open: rem / total, sections_open: rem }); rem -= b[k]; }
}
save("close_curves", curves);

save("late_sections", Object.entries(d.late ?? {}).filter(([k]) => names[k]).map(([k, v]: any) => ({ election: names[k], sections: v.n, closed_1_to_49_min_late: v.queue, closed_49_min_or_more_late: v.late })));

save("timeline", JSON.parse(readFileSync("timeline.json", "utf8")).map((e: any, i: number) => ({ id: i, date: e.d, time: e.t, event: e.txt, event_pt: e.txt_pt ?? null, key_moment: !!e.key, sources_differ: e.note ?? null, sources_differ_pt: e.note_pt ?? null, source: e.src })));

const s = d.summary;
save("extension", [{
  status: s ? "measured" : "waiting_for_tse_file",
  sections_open_after_1749: s?.extended.sec ?? null, voters_in_those_sections: s?.extended.comp ?? null,
  lula_in_those_sections: s?.extended.c13 ?? null, flavio_in_those_sections: s?.extended.c22 ?? null,
  sections_queue_1_to_49: s?.queue.sec ?? null,
  margin: n.r2.L - n.r2.F, turnout: n.r2.comp,
  margin_without_late_sections: s?.marginWithoutExtended ?? null,
}]);

const lanes: any[] = [];
const logLane = (file: string, day: string, example: string, shift: number) => {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.startsWith(day) || !line.includes("O voto do eleitor foi computado")) continue;
    const t = +line.slice(11, 13) * 60 + +line.slice(14, 16) + +line.slice(17, 19) / 60 + shift;
    if (t >= 16 * 60 + 30) lanes.push({ example, kind: "vote", minute_of_day: Math.round(t * 100) / 100 });
  }
  for (const line of readFileSync(file, "utf8").split("\n")) if (line.startsWith(day) && line.includes("Procedimento de encerramento confirmado")) lanes.push({ example, kind: "close", minute_of_day: +line.slice(11, 13) * 60 + +line.slice(14, 16) + +line.slice(17, 19) / 60 + shift });
};
const logPath = process.env.LANE_LOG ?? "";
if (logPath && existsSync(logPath)) {
  logLane(logPath, "04/10/2026", "queue: Cruzeiro do Sul (AC), zone 4, section 479, round 1", 120);
  logLane(logPath, "25/10/2026", "open but empty: Cruzeiro do Sul (AC), zone 4, section 479, runoff", 120);
}
if (lanes.length) save("urna_log_examples", lanes);

const topo = JSON.parse(readFileSync("geo/br.topo.json", "utf8"));
const ufTopo = JSON.parse(readFileSync("geo/uf.topo.json", "utf8"));
const W = 1000, H = 1000;
const proj = geoMercator().fitExtent([[8, 8], [W - 8, H - 8]], merge(ufTopo, ufTopo.objects.uf.geometries) as any);
const path = geoPath(proj).digits(1);
const rewind = (f: any) => {
  const fix = (rings: number[][][]) => (geoArea({ type: "Polygon", coordinates: rings } as any) > 2 * Math.PI ? rings.map((r) => r.slice().reverse()) : rings);
  const g = f.geometry;
  if (g?.type === "Polygon") g.coordinates = fix(g.coordinates);
  if (g?.type === "MultiPolygon") g.coordinates = g.coordinates.map(fix);
  return f;
};
const feats = (feature(topo, topo.objects.mun) as any).features.map(rewind);
console.log("inverted after rewind", feats.filter((f: any) => geoArea(f) > 2 * Math.PI).length);
save("map_municipalities", feats.map((f: any) => ({ ibge: f.properties.id, path: path(f) })).filter((r: any) => r.path));
const ufFeats = (feature(ufTopo, ufTopo.objects.uf) as any).features;
save("map_states", [
  ...ufFeats.map((f: any) => { const c = path.centroid(f), b = path.bounds(f); return { uf: IBGE_UF[f.properties.uf], path: path(f), x: Math.round(c[0]), y: Math.round(c[1]), x0: Math.floor(b[0][0]), y0: Math.floor(b[0][1]), x1: Math.ceil(b[1][0]), y1: Math.ceil(b[1][1]) }; }),
  { uf: "borders", path: path(mesh(ufTopo, ufTopo.objects.uf, (a: any, b: any) => a !== b) as any), x: null, y: null, x0: null, y0: null, x1: null, y1: null },
]);

const world = JSON.parse(readFileSync("geo/world-110m.json", "utf8"));
const wf = (feature(world, world.objects.countries) as any).features.filter((f: any) => f.properties.name !== "Antarctica");
const millerRaw = (l: number, p: number) => [l, 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * p))];
(millerRaw as any).invert = (x: number, y: number) => [x, 2.5 * Math.atan(Math.exp(0.8 * y)) - 0.625 * Math.PI];
const wproj = geoProjection(millerRaw as any).fitExtent([[6, 6], [994, 494]], { type: "FeatureCollection", features: wf } as any);
const wpath = geoPath(wproj).digits(1);
save("map_world", wf.map((f: any) => ({ iso: f.id ?? null, country: f.properties.name, path: wpath(f) })));

const readRows = (p: string) => existsSync(p) ? readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const sumZz = (p: string) => { const m = new Map<string, any>(); for (const r of readRows(p)) { if (r.uf !== "zz") continue; const v = m.get(r.mun) ?? { L: 0, F: 0, V: 0 }; v.L += r.c13; v.F += r.c22; v.V += r.c13 + r.c22 + (r.other ?? 0); m.set(r.mun, v); } return m; };
const z18 = sumZz("data/b18/sec.ndjson"), z22 = sumZz("data/b22/sec.ndjson"), z1 = sumZz("data/r1/sec.ndjson");
const z2 = new Map(readRows("data/r2-mun.ndjson").filter((r) => r.uf === "zz").map((r) => [r.mun, r]));
const REGIONS: Record<string, string> = {
  Europe: "528 300 724 056 642 348 250 276 756 372 826 380 620 705 703 233 246 208 752 578 616 040 203 688 100 191 070 008 804 643 196",
  Americas: "840 124 484 084 320 340 222 558 188 591 192 214 332 388 044 052 662 780 028 032 068 152 170 218 328 600 604 740 858 862",
  Africa: "384 566 288 231 012 624 178 818 120 324 204 686 834 716 404 266 454 768 024 894 226 508 504 434 788 854 710 072 516 132 678 466 180",
  Asia: "784 400 792 398 368 031 764 048 422 144 050 760 634 626 360 524 586 414 458 608 356 408 275 682 410 702 158 364 376 392 704 156 104 051 268 512",
  Oceania: "036 554",
};
const regionOf = (code: string, iso: string) => (code === "29475" || code === "99333" ? "Americas" : Object.entries(REGIONS).find(([, l]) => l.split(" ").includes(iso))?.[0] ?? "Other");
const ptName = new Map<string, string>(JSON.parse(readFileSync("data/mun-cm.json", "utf8")).abr.find((a: any) => a.cd === "zz").mu.map((m: any) => [m.cd, title(m.nm)]));
save("abroad", readFileSync("data/abroad-geo.txt", "utf8").trim().split("\n").map((l) => {
  const [code, city, country, iso, lat, lon] = l.split("|");
  const [x, y] = wproj([+lon, +lat])!;
  const a = z1.get(code), b = z2.get(code), c = z18.get(code), e = z22.get(code);
  return { code, city, city_pt: ptName.get(code) ?? null, country, iso, region: regionOf(code, iso), x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10,
    r1_lula: a?.L ?? null, r1_flavio: a?.F ?? null, r1_valid: a?.V ?? null,
    r2_lula: b?.c13 ?? null, r2_flavio: b?.c22 ?? null,
    y2018_haddad: c?.L ?? null, y2018_bolsonaro: c?.F ?? null, y2022_lula: e?.L ?? null, y2022_bolsonaro: e?.F ?? null };
}));

const r1br = JSON.parse(readFileSync("data/r1-br.json", "utf8"));
const r1cands: any[] = [];
for (const ag of r1br.carg[0].agr) for (const p of ag.par) for (const c of p.cand) r1cands.push({ number: c.n, name: title(c.nmu), party: p.sg, votes: +c.vap });
r1cands.sort((a, b) => b.votes - a.votes);
save("r1_candidates", r1cands);

const r2uf = JSON.parse(readFileSync("data/r2-uf.json", "utf8"));
const r1area = new Map<string, { L: number; F: number; O: number; B: number; N: number; comp: number }>();
for (const l of readFileSync("data/r1/sec.ndjson", "utf8").split("\n")) {
  if (!l) continue;
  const s = JSON.parse(l);
  for (const k of [s.uf, "br"]) {
    const a = r1area.get(k) ?? { L: 0, F: 0, O: 0, B: 0, N: 0, comp: 0 };
    a.L += s.c13; a.F += s.c22; a.O += s.other; a.B += s.branco; a.N += s.nulo; a.comp += s.comp;
    r1area.set(k, a);
  }
}
const sources = [...r1area.entries()].map(([uf, a]) => {
  const b = r2uf[uf];
  const gainL = b.c13 - a.L, gainF = b.c22 - a.F, turnout = b.comp - a.comp, blankNull = a.B + a.N - (b.branco + b.nulo);
  if (gainL + gainF !== a.O + turnout + blankNull) throw new Error(`accounting does not add up for ${uf}`);
  return { uf, area: uf === "br" ? "Brazil" : UF_NAMES[uf], gain_lula: gainL, gain_flavio: gainF, gain_total: gainL + gainF, from_other_candidates: a.O, from_turnout: turnout, from_fewer_blank_null: blankNull };
}).sort((x, y) => (x.uf === "br" ? -1 : y.uf === "br" ? 1 : y.gain_total - x.gain_total));
save("vote_sources", sources);

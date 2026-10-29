const N = (v) => (v == null || v === "" ? null : Number(v));
const track = (event, props) => { try { window.bzTrack?.(event, props); } catch {} };
/*I18N*//*END_I18N*/
let LANG = "en", DEC = ".";
const LOC = { en: d3.formatLocale({ decimal: ".", thousands: ",", grouping: [3], currency: ["$", ""] }).format(","), pt: d3.formatLocale({ decimal: ",", thousands: ".", grouping: [3], currency: ["R$", ""] }).format(",") };
const tr = (t) => (LANG === "pt" && PT_JS[t] != null ? PT_JS[t] : t);
const cityName = (a) => (LANG === "pt" && a.city_pt ? a.city_pt : a.city);
const fmtInt = (v) => LOC[LANG](v), fmtSigned = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmtInt(Math.abs(v));
const FMT = { pct: (v) => v.toFixed(2).replace(".", DEC) + "%", pct1: (v) => v.toFixed(1).replace(".", DEC) + "%", pct0: (v) => Math.round(v) + "%", int: (v) => fmtInt(v), signed: fmtSigned, pp: (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1).replace(".", DEC) + " pp", r3: (v) => v.toFixed(3).replace(".", DEC), n2: (v) => v.toFixed(2).replace(".", DEC) };
const two = (a, b) => (a == null || b == null || a + b === 0 ? null : (100 * a) / (a + b));
const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);

dash.calc("national_shares", {
  inputs: ["national"],
  title: "Shares and margins per election",
  description: "Each candidate's share of the votes used for that election (two candidates in a runoff, all valid votes in round 1), and the gap in votes.",
  fn: (national) => national.map((r) => {
    const left = Number(r.left), right = Number(r.right), base = r.key.endsWith("r1") ? Number(r.valid) : left + right;
    return { key: r.key, election: r.election, left_name: r.left_name, right_name: r.right_name, left, right, valid: Number(r.valid), left_pct: Math.round((10000 * left) / base) / 100, right_pct: Math.round((10000 * right) / base) / 100, margin: left - right, margin_abs: Math.abs(left - right) };
  }),
});

dash.calc("state_change", {
  inputs: ["states"],
  title: "State results and changes",
  description: "Per state: shares in each election, Lula's shift in the two-candidate share since round 1, and the change in the vote gap.",
  fn: (states) => states.map((s) => {
    const n = (v) => (v == null || v === "" ? null : Number(v));
    const p = (a, b) => (a == null || b == null || a + b === 0 ? null : Math.round((10000 * a) / (a + b)) / 100);
    const r1L = n(s.r1_lula), r1F = n(s.r1_flavio), r2L = n(s.r2_lula), r2F = n(s.r2_flavio);
    return {
      uf: s.uf, state: s.state,
      y2018_pt_pct: p(n(s.y2018_haddad), n(s.y2018_bolsonaro)), y2022_lula_pct: p(n(s.y2022_lula), n(s.y2022_bolsonaro)),
      r1_lula_pct: Math.round((10000 * r1L) / n(s.r1_valid)) / 100, r1_flavio_pct: Math.round((10000 * r1F) / n(s.r1_valid)) / 100,
      r2_lula_pct: p(r2L, r2F), shift_vs_r1: r2L == null ? null : Math.round(100 * (p(r2L, r2F) - p(r1L, r1F))) / 100,
      margin_change: r2L == null ? null : (r2L - r2F) - (r1L - r1F), lula_gain: r2L == null ? null : r2L - r1L, flavio_gain: r2F == null ? null : r2F - r1F,
      late_2022: n(s.late_2022), sections_2022: n(s.sections_2022), late_2026_r2: n(s.late_2026_r2), sections_2026_r2: n(s.sections_2026_r2),
    };
  }),
});

dash.calc("swing_summary", {
  inputs: ["state_change"],
  title: "Turnaround, round 1 to runoff",
  description: "Total change in the Lula minus Flávio gap over all states, the votes each candidate gained, and the four states that moved it most.",
  fn: (state_change) => {
    const rows = state_change.filter((s) => s.margin_change != null).sort((a, b) => b.margin_change - a.margin_change);
    const total = rows.reduce((a, s) => a + s.margin_change, 0), top = rows.slice(0, 4);
    return [{ total_change: total, lula_gain: rows.reduce((a, s) => a + s.lula_gain, 0), flavio_gain: rows.reduce((a, s) => a + s.flavio_gain, 0), top4: top.map((s) => s.state).join(", "), top4_pct: Math.round((100 * top.reduce((a, s) => a + s.margin_change, 0)) / total) }];
  },
});

dash.calc("sources_summary", {
  inputs: ["vote_sources", "r1_candidates"],
  title: "Where the new votes came from",
  description: "Brazil row of the vote-source accounting with each source's share of the new votes, and the three biggest other round-1 candidates' combined votes.",
  fn: (vote_sources, r1_candidates) => {
    const b = vote_sources.find((r) => r.uf === "br"), t = Number(b.gain_total);
    const others = r1_candidates.filter((c) => c.number !== "13" && c.number !== "22").sort((x, y) => Number(y.votes) - Number(x.votes));
    return [{ gain_total: t, gain_lula: Number(b.gain_lula), gain_flavio: Number(b.gain_flavio), pct_lula: Math.round((100 * Number(b.gain_lula)) / t), pct_flavio: Math.round((100 * Number(b.gain_flavio)) / t), from_other: Number(b.from_other_candidates), from_turnout: Number(b.from_turnout), from_blank_null: Number(b.from_fewer_blank_null),
      pct_other: Math.round((100 * Number(b.from_other_candidates)) / t), pct_turnout: Math.round((100 * Number(b.from_turnout)) / t), pct_blank_null: Math.round((100 * Number(b.from_fewer_blank_null)) / t),
      big3: others.slice(0, 3).reduce((a, c) => a + Number(c.votes), 0) }];
  },
});

dash.calc("late_rates", {
  inputs: ["late_sections"],
  title: "Sections open 49+ minutes late",
  description: "Per election, how many sections closed 49 minutes or more after the official close, and their share of all sections.",
  fn: (late_sections) => late_sections.map((r) => ({ election: r.election, sections: Number(r.sections), very_late: Number(r.closed_49_min_or_more_late), very_late_pct: r.sections == null || r.sections === "" ? null : Math.round((10000 * Number(r.closed_49_min_or_more_late)) / Number(r.sections)) / 100 })),
});

dash.calc("extension_view", {
  inputs: ["extension"],
  title: "Extension measurement",
  description: "Votes cast after 17:00 in the urnas still open at 17:45, counted from each urna's log, split into the 17:00 queue and new arrivals after a pause, and Lula's margin range without them.",
  fn: (extension) => extension.map((e) => {
    const n = (v) => (v == null || v === "" ? null : Number(v));
    return { status: e.status, margin: n(e.margin), turnout: n(e.turnout), margin_pct_of_turnout: Math.round((10000 * n(e.margin)) / n(e.turnout)) / 100,
      urnas_open: n(e.urnas_open_after_1745), urnas_open_1749: n(e.urnas_open_after_1749), urnas_with_late: n(e.urnas_with_late_vote), votes_after_17: n(e.votes_after_17), queue: n(e.queue), after_pause: n(e.after_pause), votes_after_1749: n(e.votes_after_1749),
      margin_min: n(e.margin_min_without_late), margin_max: n(e.margin_max_without_late) };
  }),
});

const S = { prepared: false, mun: new Map(), shapes: [], states: [], borders: null, world: [], abroad: [], colors: null, storyView: "br:r1", exArea: "br", exRegion: "World", exCity: null, exMode: "r2", exState: null, exMun: null, sortKey: "margin_change", sortDir: -1, srcKey: "from_other_candidates", srcDir: -1, page: "story" };
window.bzState = S;

function rows(id) { const d = dash.data(id); return d.status === "ok" ? d.data : null; }
const colorCanvas = document.createElement("canvas"); colorCanvas.width = colorCanvas.height = 1;
function resolveColor(c, under) {
  const el = document.createElement("span"); el.style.color = c; document.querySelector(".bz").appendChild(el); const css = getComputedStyle(el).color; el.remove();
  const g = colorCanvas.getContext("2d", { willReadFrequently: true }); g.clearRect(0, 0, 1, 1);
  if (under) { g.fillStyle = under; g.fillRect(0, 0, 1, 1); }
  g.fillStyle = css; g.fillRect(0, 0, 1, 1);
  const [r, gr, b] = g.getImageData(0, 0, 1, 1).data; return `rgb(${r}, ${gr}, ${b})`;
}
function themeColors() {
  const list = dash.colors.map((c) => resolveColor(c));
  const hue = (c) => { const h = d3.hsl(c).h; return isNaN(h) ? 999 : h; };
  const red = list.slice().sort((a, b) => Math.min(Math.abs(hue(a) - 0), Math.abs(hue(a) - 360)) - Math.min(Math.abs(hue(b) - 0), Math.abs(hue(b) - 360)))[0];
  const blue = list.slice().sort((a, b) => Math.abs(hue(a) - 215) - Math.abs(hue(b) - 215))[0];
  const panel = resolveColor("var(--color-panel)"), mid = d3.interpolateRgb(panel, resolveColor("var(--color-fg-muted)", panel))(0.22), muted = resolveColor("var(--cds-chart-muted)", panel), fg = resolveColor("var(--color-fg)"), fgm = resolveColor("var(--color-fg-muted)"), warn = resolveColor("var(--color-warn)");
  return { red, blue, mid, muted, panel, fg, fgm, warn, list };
}

function bindValues() {
  document.querySelectorAll(".bz .bz-v").forEach((el) => {
    const d = rows(el.dataset.source);
    if (!d) { el.textContent = "—"; return; }
    const where = el.dataset.where ? Object.fromEntries(el.dataset.where.split("&").map((kv) => kv.split("=").map(decodeURIComponent))) : null;
    const row = where ? d.find((r) => Object.entries(where).every(([k, v]) => String(r[k]) === v)) : d[0];
    const v = row ? row[el.dataset.field] : null;
    el.textContent = v == null ? "—" : el.dataset.fmt ? FMT[el.dataset.fmt](Number(v)) : String(v);
  });
}

function prepare() {
  if (S.prepared) return true;
  const shapes = rows("map_municipalities"), st = rows("map_states"), world = rows("map_world");
  if (!shapes || !st || !world) return false;
  S.shapes = shapes.map((r) => ({ ibge: String(r.ibge), p: new Path2D(r.path) }));
  S.states = st.filter((r) => r.uf !== "borders").map((r) => ({ uf: r.uf, p: new Path2D(r.path), x: N(r.x), y: N(r.y), box: [N(r.x0), N(r.y0), N(r.x1), N(r.y1)] }));
  S.borders = new Path2D(st.find((r) => r.uf === "borders").path);
  S.world = world.map((r) => ({ iso: String(r.iso), country: r.country, path: r.path }));
  S.prepared = true;
  return true;
}
function indexData() {
  const m = rows("municipalities");
  if (m && S.mun.size !== m.length) {
    S.mun = new Map(m.map((r) => [String(r.ibge), r]));
    const dl = document.getElementById("exMunList");
    dl.replaceChildren(...m.map((r) => { const o = document.createElement("option"); o.value = `${r.name} (${String(r.uf).toUpperCase()})`; return o; }));
  }
  const a = rows("abroad");
  if (a) S.abroad = a;
}

const MODE = {
  r1: { title: "2026 round 1", left: "Lula", right: "Flávio", kind: "div", max: 60, val: (r) => (N(r.r1_valid) ? (100 * (N(r.r1_lula) - N(r.r1_flavio))) / N(r.r1_valid) : null), how: "Lula minus Flávio, as a share of all valid votes." },
  r2: { title: "2026 runoff", left: "Lula", right: "Flávio", kind: "div", max: 60, val: (r) => { const s = two(N(r.r2_lula), N(r.r2_flavio)); return s == null ? null : 2 * s - 100; }, how: "Lula's lead over Flávio, in points of the two-candidate vote." },
  y22: { title: "2022 runoff", left: "Lula", right: "Jair Bolsonaro", kind: "div", max: 60, val: (r) => { const s = two(N(r.y2022_lula), N(r.y2022_bolsonaro)); return s == null ? null : 2 * s - 100; }, how: "Lula's lead over Jair Bolsonaro in 2022." },
  y18: { title: "2018 runoff", left: "Haddad", right: "Jair Bolsonaro", kind: "div", max: 60, val: (r) => { const s = two(N(r.y2018_haddad), N(r.y2018_bolsonaro)); return s == null ? null : 2 * s - 100; }, how: "Haddad's (PT) lead over Jair Bolsonaro in 2018." },
  sw: { title: "Change since round 1", left: "toward Lula", right: "toward Flávio", kind: "chg", max: 8, val: (r) => { const a = two(N(r.r2_lula), N(r.r2_flavio)), b = two(N(r.r1_lula), N(r.r1_flavio)); return a == null || b == null ? null : a - b; }, how: "Change in Lula's share of the two-candidate vote, round 1 to runoff, in points." },
  s22: { title: "Change since 2022", left: "more PT", right: "more Bolsonaro", kind: "chg", max: 10, val: (r) => { const a = two(N(r.r2_lula), N(r.r2_flavio)), b = two(N(r.y2022_lula), N(r.y2022_bolsonaro)); return a == null || b == null ? null : a - b; }, how: "Change in the PT share of the two-candidate vote, 2022 runoff to 2026 runoff." },
  s18: { title: "Change since 2018", left: "more PT", right: "more Bolsonaro", kind: "chg", max: 30, val: (r) => { const a = two(N(r.r2_lula), N(r.r2_flavio)), b = two(N(r.y2018_haddad), N(r.y2018_bolsonaro)); return a == null || b == null ? null : a - b; }, how: "Change in the PT share of the two-candidate vote, 2018 runoff to 2026 runoff." },
  ext: { title: "Open after 17:49", kind: "seq", max: 10, val: (r) => N(r.sections_late), how: "Number of sections whose urna closed at 17:49 Brasília or later." },
};
function scaleFor(mode, maxOverride) {
  const C = S.colors, m = { ...MODE[mode], max: maxOverride ?? MODE[mode].max };
  if (m.kind === "seq") { const ip = d3.interpolateRgb(C.mid, C.warn); return d3.scaleThreshold([1, 2, 4, 8], [0.12, 0.35, 0.55, 0.78, 1].map(ip)); }
  const ip = d3.piecewise(d3.interpolateRgb, [C.blue, d3.interpolateRgb(C.blue, C.mid)(0.55), C.mid, d3.interpolateRgb(C.red, C.mid)(0.55), C.red]);
  const steps = 9, colors = d3.range(steps).map((i) => ip(i / (steps - 1)));
  return d3.scaleQuantize([-m.max, m.max], colors);
}
function legend(el, mode, maxOverride) {
  const m = { ...MODE[mode], max: maxOverride ?? MODE[mode].max }, sc = scaleFor(mode, maxOverride);
  el.replaceChildren();
  const ramp = document.createElement("div"); ramp.className = "bz-ramp";
  const cv = document.createElement("canvas"); cv.width = 260; cv.height = 8; const g = cv.getContext("2d");
  for (let x = 0; x < 260; x++) { g.fillStyle = m.kind === "seq" ? sc((x / 260) * m.max) : sc(((x / 260) * 2 - 1) * m.max); g.fillRect(x, 0, 1, 8); }
  const ends = document.createElement("div");
  const labels = m.kind === "seq" ? ["0", `${m.max}+ ${tr("sections")}`] : m.kind === "chg" ? [`${m.max} ${tr("pts")} ${tr(m.right)}`, `${m.max} ${tr("pts")} ${tr(m.left)}`] : [`${tr(m.right)} +${m.max}`, `${tr(m.left)} +${m.max}`];
  ends.replaceChildren(...labels.map((t) => { const s = document.createElement("span"); s.textContent = t; return s; }));
  ramp.append(cv, ends); el.appendChild(ramp);
  const sw = document.createElement("span"); sw.textContent = tr("Gray: no data"); el.appendChild(sw);
}

function drawBrazil(canvas, mode, box, highlight) {
  const w = canvas.clientWidth || canvas.parentElement.clientWidth, dpr = window.devicePixelRatio || 1;
  const [x0, y0, x1, y1] = box ?? [0, 0, 1000, 1000], bw = x1 - x0, bh = y1 - y0, inStick = !!canvas.closest(".bz-stick") && matchMedia("(max-width: 860px)").matches;
  const h = Math.round(Math.min(w * (bh / bw), inStick ? window.innerHeight * 0.38 : 640));
  canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const k = Math.min(w / bw, h / bh) * dpr, tx = (canvas.width - bw * k) / 2 - x0 * k, ty = (canvas.height - bh * k) / 2 - y0 * k;
  const g = canvas.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); g.setTransform(k, 0, 0, k, tx, ty);
  const sc = scaleFor(mode), f = MODE[mode].val, fb = stateFallback(mode), fade = (c) => d3.interpolateRgb(c, S.colors.mid)(0.6);
  let faded = 0;
  for (const s of S.shapes) {
    const r = S.mun.get(s.ibge); let v = r ? f(r) : null, col;
    if (v == null && r && fb.get(r.uf) != null) { col = fade(sc(fb.get(r.uf))); faded++; }
    else col = v == null ? S.colors.mid : sc(v);
    g.fillStyle = col; g.fill(s.p);
  }
  canvas._hatched = faded;
  g.lineWidth = (0.35 * dpr) / k; g.strokeStyle = S.colors.panel; g.globalAlpha = 0.55;
  for (const s of S.shapes) g.stroke(s.p);
  g.globalAlpha = 1;
  g.lineWidth = (1.3 * dpr) / k; g.strokeStyle = S.colors.panel; g.lineJoin = "miter"; g.stroke(S.borders);
  if (highlight) { const s = S.shapes.find((q) => q.ibge === highlight); if (s) { g.lineWidth = 2.5 / k * dpr; g.strokeStyle = S.colors.fg; g.stroke(s.p); } }
  const pick = document.createElement("canvas"); pick.width = canvas.width; pick.height = canvas.height;
  const pg = pick.getContext("2d", { willReadFrequently: true }); pg.setTransform(k, 0, 0, k, tx, ty);
  const level = box ? "mun" : "state";
  if (level === "mun") S.shapes.forEach((s, i) => { pg.fillStyle = `rgb(${(i + 1) & 255},${((i + 1) >> 8) & 255},1)`; pg.fill(s.p); });
  else S.states.forEach((s, i) => { pg.fillStyle = `rgb(${i + 1},0,2)`; pg.fill(s.p); });
  canvas._pick = { pg, dpr, level };
}
function pickAt(canvas, ev) {
  const r = canvas.getBoundingClientRect(), P = canvas._pick; if (!P) return null;
  const px = P.pg.getImageData(Math.floor((ev.clientX - r.left) * P.dpr), Math.floor((ev.clientY - r.top) * P.dpr), 1, 1).data;
  if (px[3] < 255) return null;
  if (px[2] === 2) { const st = S.states[px[0] - 1]; return st ? { kind: "state", id: st.uf } : null; }
  if (px[2] !== 1) return null;
  const i = px[0] + (px[1] << 8) - 1; return S.shapes[i] ? { kind: "mun", id: S.shapes[i].ibge } : null;
}

function stateFallback(mode) {
  const out = new Map(), st = rows("states");
  if (!st || !["r2", "sw", "s22", "s18"].includes(mode)) return out;
  for (const s of st) {
    const a = two(N(s.r2_lula), N(s.r2_flavio)); if (a == null) continue;
    const b = mode === "sw" ? two(N(s.r1_lula), N(s.r1_flavio)) : mode === "s22" ? two(N(s.y2022_lula), N(s.y2022_bolsonaro)) : mode === "s18" ? two(N(s.y2018_haddad), N(s.y2018_bolsonaro)) : null;
    out.set(s.uf, mode === "r2" ? 2 * a - 100 : b == null ? null : a - b);
  }
  return out;
}
function hatchPattern(g) {
  const t = document.createElement("canvas"); t.width = t.height = 8; const c = t.getContext("2d");
  c.strokeStyle = S.colors.panel; c.globalAlpha = 0.55; c.lineWidth = 2; c.beginPath(); c.moveTo(-2, 10); c.lineTo(10, -2); c.moveTo(-2, 2); c.lineTo(2, -2); c.moveTo(6, 10); c.lineTo(10, 6); c.stroke();
  const p = g.createPattern(t, "repeat"), m = g.getTransform();
  p.setTransform(new DOMMatrix().scale(1 / m.a, 1 / m.d).translate(-m.e, -m.f));
  return p;
}
function hatchNote(el, canvas) {
  if (!canvas._hatched) return;
  const sp = document.createElement("span");
  sp.innerHTML = '<span style="display:inline-block;width:14px;height:10px;vertical-align:middle;margin-right:6px;border-radius:2px;background:var(--color-fg-muted);opacity:.35"></span>';
  sp.append(tr("Faded: municipal runoff result not loaded yet, so the area shows its state's result (") + fmtInt(canvas._hatched) + tr(" municipalities)."));
  el.appendChild(sp);
}
const WORLD_MAX = 40;
function cityPoints(mode) {
  const m = MODE[mode];
  return S.abroad.map((a) => ({ a, v: m.val(a), size: N(a.r2_lula) != null ? N(a.r2_lula) + N(a.r2_flavio) : N(a.r1_valid) ?? 0 })).filter((d) => d.size > 0).sort((p, q) => q.size - p.size);
}
function regionBox(region) {
  if (!region || region === "World") return [0, 0, 1000, 500];
  const pts = S.abroad.filter((a) => a.region === region);
  let [x0, x1] = d3.extent(pts, (a) => N(a.x)), [y0, y1] = d3.extent(pts, (a) => N(a.y));
  const pad = 30; x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
  let w = x1 - x0, h = y1 - y0;
  if (w / h < 2) { const nw = h * 2; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / 2; y0 -= (nh - h) / 2; h = nh; }
  return [x0, y0, w, h];
}
const SUM_FIELDS = ["r1_lula", "r1_flavio", "r1_valid", "r2_lula", "r2_flavio", "y2018_haddad", "y2018_bolsonaro", "y2022_lula", "y2022_bolsonaro"];
function countryRows() {
  const by = new Map();
  for (const a of S.abroad) {
    const c = by.get(a.iso) ?? { iso: a.iso, country: a.country, cities: [], x: N(a.x), y: N(a.y) };
    c.cities.push(a);
    for (const f of SUM_FIELDS) { const v = N(a[f]); if (v != null) c[f] = (c[f] ?? 0) + v; }
    by.set(a.iso, c);
  }
  return by;
}
function drawWorld(svgEl, mode, region) {
  const svg = d3.select(svgEl), box = regionBox(region), k = 1000 / box[2];
  svg.attr("viewBox", box.join(" ")).attr("width", "100%").attr("role", "img").attr("aria-label", "World map: result of Brazilians abroad by country");
  svg.selectAll("*").remove();
  const land = d3.interpolateRgb(S.colors.panel, S.colors.fgm)(0.16), sc = scaleFor(mode, WORLD_MAX), m = MODE[mode], by = countryRows();
  const fillOf = (c) => { if (!c) return land; const v = m.val(c); return v == null ? S.colors.mid : sc(v); };
  svg.append("g").selectAll("path").data(S.world).join("path").attr("class", (d) => (by.has(d.iso) ? "bz-country" : null)).attr("d", (d) => d.path)
    .attr("fill", (d) => fillOf(by.get(d.iso))).attr("stroke", S.colors.panel).attr("stroke-width", 0.7 / k);
  const shown = new Set(S.world.map((w) => w.iso)), tiny = [...by.values()].filter((c) => !shown.has(c.iso));
  const sz = 4.5 / Math.sqrt(k);
  svg.append("g").selectAll("path").data(tiny).join("path").attr("class", "bz-country").attr("d", (c) => `M${c.x},${c.y - sz}L${c.x + sz},${c.y}L${c.x},${c.y + sz}L${c.x - sz},${c.y}Z`)
    .attr("fill", (c) => fillOf(c)).attr("stroke", S.colors.fg).attr("stroke-width", 0.6 / k);
  svgEl._byIso = by;
  svgEl._tiny = tiny.filter((c) => (c.r2_lula ?? 0) + (c.r2_flavio ?? 0) > 0).map((c) => c.country);
  return svg;
}
function countryTip(c) {
  const row = (k, v) => `<div class="bz-r"><span>${k}</span><span>${v}</span></div>`;
  const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  let h = tipHtmlMun({ ...c, city: c.country, country: null, name: undefined, uf: undefined });
  const cities = c.cities.slice().sort((a, b) => ((N(b.r2_lula) ?? 0) + (N(b.r2_flavio) ?? 0)) - ((N(a.r2_lula) ?? 0) + (N(a.r2_flavio) ?? 0)));
  h += `<div class="bz-t" style="margin-top:4px">${tr(cities.length === 1 ? "Voting city" : "Voting cities")}</div>`;
  for (const a of cities.slice(0, 6)) { const s2 = two(N(a.r2_lula), N(a.r2_flavio)); h += row(esc(cityName(a)), s2 == null ? "–" : `Lula ${s2.toFixed(0).replace(".", DEC)}%`); }
  if (cities.length > 6) h += `<div class="bz-t">+${cities.length - 6} ${tr("more")}</div>`;
  return h;
}
function worldTinyNote(el, svgEl) {
  if (!svgEl._tiny?.length) return;
  const sp = document.createElement("span"); sp.textContent = tr("Diamonds: countries too small for this map (") + svgEl._tiny.join(", ") + ").";
  el.appendChild(sp);
}
function cityBars(el, mode, onPick) {
  const pts = cityPoints(mode).slice(0, 12), sc = scaleFor(mode, WORLD_MAX);
  const wrap = document.createElement("div"); wrap.className = "bz-cities";
  const head = document.createElement("p"); head.className = "bz-cap"; head.textContent = tr("Biggest voting cities abroad, by votes. Bar: Lula's lead (red) or Flávio's (blue), in points.");
  wrap.appendChild(head);
  const max = d3.max(pts, (d) => Math.abs(d.v ?? 0)) || 1;
  for (const d of pts) {
    const row = document.createElement("button"); row.className = "bz-cityrow"; row.type = "button";
    const name = document.createElement("span"); name.textContent = cityName(d.a);
    const bar = document.createElement("span"); bar.className = "bz-citybar";
    const fill = document.createElement("span"); const v = d.v ?? 0, wpc = (50 * Math.abs(v)) / max;
    fill.style.cssText = `position:absolute;top:2px;bottom:2px;border-radius:3px;background:${sc(v)};${v >= 0 ? "left:50%" : "right:50%"};width:${wpc}%`;
    bar.appendChild(fill);
    const val = document.createElement("span"); val.className = "bz-num"; val.textContent = d.v == null ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(0).replace(".", DEC);
    row.append(name, bar, val);
    if (onPick) row.addEventListener("click", () => onPick(d.a.code));
    wrap.appendChild(row);
  }
  el.appendChild(wrap);
}
function tipHtmlMun(r) {
  const row = (k, v) => `<div class="bz-r"><span>${k}</span><span>${v}</span></div>`;
  const sh = (a, b) => { const s = two(N(a), N(b)); return s == null ? "–" : `${s.toFixed(1).replace(".", DEC)}% / ${(100 - s).toFixed(1).replace(".", DEC)}%`; };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let h = `<div class="bz-t">${esc(r.name ?? cityName(r))}${r.uf ? " · " + esc(String(r.uf).toUpperCase()) : r.country ? " · " + esc(r.country) : ""}</div>`;
  h += row(tr("2018 Haddad / Bolsonaro"), sh(r.y2018_haddad, r.y2018_bolsonaro));
  h += row(tr("2022 Lula / Bolsonaro"), sh(r.y2022_lula, r.y2022_bolsonaro));
  h += row(tr("2026 R1 Lula / Flávio"), N(r.r1_valid) ? `${((100 * N(r.r1_lula)) / N(r.r1_valid)).toFixed(1).replace(".", DEC)}% / ${((100 * N(r.r1_flavio)) / N(r.r1_valid)).toFixed(1).replace(".", DEC)}%` : "–");
  h += row(tr("2026 runoff Lula / Flávio"), N(r.r2_lula) == null ? tr("not loaded yet") : sh(r.r2_lula, r.r2_flavio));
  if (N(r.sections_late) != null) h += row(tr("Sections open after 17:49"), fmtInt(N(r.sections_late)));
  if (N(r.late_votes)) h += row(tr("Votes after 17:00 in them"), fmtInt(N(r.late_votes)));
  return h;
}
function placeTip(tip, box, ev) {
  const b = box.getBoundingClientRect(); let x = ev.clientX - b.left + 14, y = ev.clientY - b.top + 14;
  if (x + 260 > b.width) x = Math.max(4, ev.clientX - b.left - 264); if (y + 150 > b.height) y = Math.max(4, ev.clientY - b.top - 154);
  tip.style.left = x + "px"; tip.style.top = y + "px";
}

function drawSwingBars(svgEl) {
  const sc = rows("state_change"); if (!sc) return;
  const data = sc.filter((s) => s.margin_change != null).sort((a, b) => b.margin_change - a.margin_change);
  const w = Math.max(320, svgEl.parentElement.clientWidth), rh = 19, m = { l: 128, r: 70, t: 22, b: 8 }, h = m.t + m.b + data.length * rh;
  const svg = d3.select(svgEl).attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%").attr("role", "img").attr("aria-label", "Change in vote gap by state");
  svg.selectAll("*").remove();
  const x = d3.scaleLinear([Math.min(0, d3.min(data, (d) => d.margin_change)), d3.max(data, (d) => d.margin_change)], [m.l, w - m.r]).nice();
  svg.append("g").selectAll("line").data(x.ticks(4)).join("line").attr("x1", (d) => x(d)).attr("x2", (d) => x(d)).attr("y1", m.t - 4).attr("y2", h - m.b).attr("stroke", "var(--cds-chart-grid)");
  svg.append("g").selectAll("text").data(x.ticks(4)).join("text").attr("x", (d) => x(d)).attr("y", m.t - 8).attr("text-anchor", "middle").attr("fill", "var(--color-fg-muted)").attr("font-size", 11).text((d) => d3.format("~s")(d));
  const g = svg.append("g").selectAll("g").data(data).join("g").attr("transform", (d, i) => `translate(0,${m.t + i * rh})`);
  g.append("text").attr("x", m.l - 8).attr("y", rh / 2 + 4).attr("text-anchor", "end").attr("fill", "var(--color-fg)").attr("font-size", 11.5).text((d) => d.state);
  g.append("rect").attr("x", (d) => x(Math.min(0, d.margin_change))).attr("y", 3).attr("height", rh - 6).attr("rx", 3).attr("width", (d) => Math.max(1, Math.abs(x(d.margin_change) - x(0)))).attr("fill", (d) => (d.margin_change >= 0 ? S.colors.red : S.colors.blue));
  g.append("text").attr("x", (d) => x(Math.max(0, d.margin_change)) + 5).attr("y", rh / 2 + 4).attr("fill", "var(--color-fg-muted)").attr("font-size", 11).text((d) => fmtSigned(d.margin_change));
}

function drawSources(svgEl) {
  const vs = rows("vote_sources"), rc = rows("r1_candidates"); if (!vs || !rc) return;
  const b = vs.find((r) => r.uf === "br"), total = N(b.gain_total);
  const parts = [[tr("Votes for other round-1 candidates"), N(b.from_other_candidates), S.colors.list[2]], [tr("More people voting"), N(b.from_turnout), S.colors.list[3]], [tr("Fewer blank and null votes"), N(b.from_fewer_blank_null), S.colors.list[6]]];
  const others = rc.filter((c) => c.number !== "13" && c.number !== "22").sort((x, y) => N(y.votes) - N(x.votes));
  const cands = [...others.slice(0, 4).map((c) => [c.name, N(c.votes)]), [tr("Others"), others.slice(4).reduce((a, c) => a + N(c.votes), 0)]];
  const w = Math.max(320, svgEl.parentElement.clientWidth), m = { l: 12, r: 12 }, iw = w - m.l - m.r;
  const svg = d3.select(svgEl).attr("viewBox", `0 0 ${w} 420`).attr("width", "100%").attr("role", "img").attr("aria-label", tr("Where the new votes came from"));
  svg.selectAll("*").remove();
  svg.append("text").attr("x", m.l).attr("y", 18).attr("fill", "var(--color-fg)").attr("font-size", 13).attr("font-weight", 600).text(tr("New votes for Lula and Flávio") + ": " + fmtInt(total));
  const x = d3.scaleLinear([0, total], [m.l, m.l + iw]);
  svg.append("text").attr("x", m.l).attr("y", 40).attr("fill", "var(--color-fg-muted)").attr("font-size", 11.5).text(tr("Where they went"));
  let accW = 0;
  for (const [name, v, c] of [["Lula", N(b.gain_lula), S.colors.red], ["Flávio", N(b.gain_flavio), S.colors.blue]]) {
    const x0 = x(accW), x1 = x(accW + v); accW += v;
    svg.append("rect").attr("x", x0).attr("y", 46).attr("width", Math.max(1, x1 - x0 - 2)).attr("height", 30).attr("rx", 4).attr("fill", c);
    if (x1 - x0 > 90) svg.append("text").attr("x", x0 + 8).attr("y", 66).attr("fill", "#fff").attr("font-size", 12).attr("font-weight", 600).text(`${name} +${fmtInt(v)} · ${Math.round((100 * v) / total)}%`);
  }
  svg.append("text").attr("x", m.l).attr("y", 98).attr("fill", "var(--color-fg-muted)").attr("font-size", 11.5).text(tr("Where they came from"));
  const g0 = svg.append("g").attr("transform", "translate(0,74)");
  let acc = 0;
  parts.forEach(([name, v, c], i) => {
    const x0 = x(acc), x1 = x(acc + v); acc += v;
    g0.append("rect").attr("x", x0).attr("y", 30).attr("width", Math.max(1, x1 - x0 - 2)).attr("height", 30).attr("rx", 4).attr("fill", c);
    const ly = 82 + i * 36;
    g0.append("rect").attr("x", m.l).attr("y", ly - 10).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", c);
    g0.append("text").attr("x", m.l + 16).attr("y", ly).attr("fill", "var(--color-fg)").attr("font-size", 12).text(name);
    g0.append("text").attr("x", m.l + 16).attr("y", ly + 15).attr("fill", "var(--color-fg-muted)").attr("font-size", 11.5).text(`${fmtInt(v)} · ${Math.round((100 * v) / total)}%`);
  });
  const top = 300, xb = d3.scaleLinear([0, d3.max(cands, (c) => c[1])], [0, iw * 0.55]);
  svg.append("text").attr("x", m.l).attr("y", top - 8).attr("fill", "var(--color-fg-muted)").attr("font-size", 11.5).text(tr("Round-1 votes of the other candidates"));
  cands.forEach(([name, v], i) => {
    const y = top + i * 22;
    svg.append("text").attr("x", m.l).attr("y", y + 12).attr("fill", "var(--color-fg)").attr("font-size", 11.5).text(name);
    svg.append("rect").attr("x", m.l + iw * 0.36).attr("y", y + 2).attr("width", Math.max(1, xb(v))).attr("height", 13).attr("rx", 3).attr("fill", "var(--cds-chart-muted)");
    svg.append("text").attr("x", m.l + iw * 0.36 + xb(v) + 6).attr("y", y + 13).attr("fill", "var(--color-fg-muted)").attr("font-size", 11).text(fmtInt(v));
  });
}

function drawLateMinutes(svgEl, tipEl) {
  const lm = rows("late_votes_minutes"); if (!lm) return;
  const data = lm.map((r) => ({ m: N(r.minute_after_17), q: N(r.queue), p: N(r.after_pause) }));
  const w = Math.max(320, svgEl.parentElement.clientWidth), h = 220, m = { l: 40, r: 12, t: 16, b: 30 };
  const x = d3.scaleLinear([0, 130], [m.l, w - m.r]), y = d3.scaleLinear([0, d3.max(data, (d) => d.q + d.p) || 1], [h - m.b, m.t]).nice();
  const svg = d3.select(svgEl).attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%").attr("role", "img").attr("aria-label", tr("Votes after 17:00, minute by minute"));
  svg.selectAll("*").remove();
  y.ticks(4).forEach((v) => { svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y(v)).attr("y2", y(v)).attr("stroke", "var(--cds-chart-grid)"); svg.append("text").attr("x", m.l - 6).attr("y", y(v) + 4).attr("text-anchor", "end").attr("fill", "var(--color-fg-muted)").attr("font-size", 10.5).text(fmtInt(v)); });
  [[0, "17:00"], [49, "17:49"], [120, "19:00"]].forEach(([t, l]) => { svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", m.t).attr("y2", h - m.b).attr("stroke", "var(--cds-chart-reference)").attr("stroke-dasharray", "3 3"); svg.append("text").attr("x", x(t) + 3).attr("y", m.t + 2).attr("fill", "var(--color-fg-muted)").attr("font-size", 10.5).text(l); });
  const bw = Math.max(2, x(5) - x(0) - 2);
  for (const dd of data) {
    svg.append("rect").attr("x", x(dd.m) + 1).attr("width", bw).attr("y", y(dd.q)).attr("height", y(0) - y(dd.q)).attr("fill", S.colors.fgm);
    svg.append("rect").attr("x", x(dd.m) + 1).attr("width", bw).attr("y", y(dd.q + dd.p)).attr("height", Math.max(0, y(dd.q) - y(dd.q + dd.p) - (dd.q ? 1 : 0))).attr("rx", 2).attr("fill", S.colors.warn);
  }
  [0, 30, 60, 90, 120].forEach((t) => svg.append("text").attr("x", x(t)).attr("y", h - 10).attr("text-anchor", "middle").attr("fill", "var(--color-fg-muted)").attr("font-size", 10.5).text(t ? "+" + t : "17:00"));
  svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", w - m.l - m.r).attr("height", h - m.t - m.b).attr("fill", "transparent")
    .on("mousemove", (ev) => { const [mx] = d3.pointer(ev); const bin = Math.floor(x.invert(mx) / 5) * 5; const dd = data.find((q) => q.m === bin); if (!dd || !tipEl) return; tipEl.hidden = false;
      tipEl.innerHTML = `<div class="bz-t">+${bin}–${bin + 5} min</div><div class="bz-r"><span>${tr("17:00 queue")}</span><span>${fmtInt(dd.q)}</span></div><div class="bz-r"><span>${tr("After a pause")}</span><span>${fmtInt(dd.p)}</span></div>`; placeTip(tipEl, svgEl.parentElement, ev); })
    .on("mouseleave", () => { if (tipEl) tipEl.hidden = true; });
}

function lateStatesTable() {
  const ls = rows("late_votes_states"), tb = document.querySelector("#lateStatesTable tbody"); if (!ls) { tb.replaceChildren(); return; }
  const cols = ["state", "urnas_open_after_1749", "urnas_with_late_vote", "votes_after_17", "queue", "after_pause", "votes_after_1749"];
  tb.replaceChildren(...ls.map((r) => { const row = document.createElement("tr"); row.dataset.key = r.uf; for (const c of cols) { const td = document.createElement("td"); td.textContent = c === "state" ? r.state : fmtInt(N(r[c])); row.appendChild(td); } return row; }));
}

function sourcesTable() {
  const vs = rows("vote_sources"), tb = document.querySelector("#sourcesTable tbody"); if (!vs) { tb.replaceChildren(); return; }
  const k = S.srcKey, dir = S.srcDir;
  const data = vs.filter((r) => r.uf !== "br").sort((a, b) => (k === "area" ? String(tr(a.area)).localeCompare(String(tr(b.area))) : N(a[k]) - N(b[k])) * dir);
  const cols = ["area", "gain_lula", "gain_flavio", "from_other_candidates", "from_turnout", "from_fewer_blank_null"];
  const mk = (r, bold) => { const row = document.createElement("tr"); row.dataset.key = r.uf; if (bold) row.style.fontWeight = "600"; for (const c of cols) { const td = document.createElement("td"); td.textContent = c === "area" ? tr(r.area) : (c.startsWith("gain") ? fmtSigned(N(r[c])) : fmtInt(N(r[c]))); row.appendChild(td); } return row; };
  tb.replaceChildren(mk(vs.find((r) => r.uf === "br"), true), ...data.map((r) => mk(r, false)));
  document.querySelectorAll("#sourcesTable th").forEach((th) => th.setAttribute("aria-sort", th.dataset.field === k ? (dir > 0 ? "ascending" : "descending") : "none"));
}

function drawCurves(svgEl, tipEl) {
  const cc = rows("close_curves"); if (!cc) return;
  const names = ["2018 runoff", "2022 runoff", "2026 round 1", "2026 runoff"];
  const series = names.map((n, i) => ({ name: n, color: i === 3 ? S.colors.red : i === 2 ? S.colors.list[2] : i === 1 ? S.colors.fgm : S.colors.list[6 % S.colors.list.length], pts: cc.filter((r) => r.election === n).map((r) => [N(r.minute), Math.max(N(r.still_open), 0.00001), N(r.sections_open)]) })).filter((s) => s.pts.length);
  const w = Math.max(320, svgEl.parentElement.clientWidth), h = 290, m = { l: 46, r: 14, t: 18, b: 34 };
  const x = d3.scaleLinear([-30, 180], [m.l, w - m.r]), y = d3.scaleLog([0.00001, 1], [h - m.b, m.t]).clamp(true);
  const svg = d3.select(svgEl).attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%").attr("role", "img").attr("aria-label", "Share of sections still open by minutes after close");
  svg.selectAll("*").remove();
  [1, 0.1, 0.01, 0.001, 0.0001, 0.00001].forEach((v) => { svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y(v)).attr("y2", y(v)).attr("stroke", "var(--cds-chart-grid)"); svg.append("text").attr("x", m.l - 6).attr("y", y(v) + 4).attr("text-anchor", "end").attr("fill", "var(--color-fg-muted)").attr("font-size", 10.5).text(v >= 0.01 ? Math.round(v * 100) + "%" : +(v * 100).toPrecision(1) + "%"); });
  for (const [t, lab] of [[0, "17:00"], [49, "17:49"], [120, "19:00"]]) { svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", m.t).attr("y2", h - m.b).attr("stroke", "var(--cds-chart-reference)").attr("stroke-dasharray", "3 3"); svg.append("text").attr("x", x(t) + 4).attr("y", m.t + 2).attr("fill", "var(--color-fg-muted)").attr("font-size", 10.5).text(lab); }
  [-30, 0, 30, 60, 90, 120, 150, 180].forEach((t) => svg.append("text").attr("x", x(t)).attr("y", h - m.b + 16).attr("text-anchor", "middle").attr("fill", "var(--color-fg-muted)").attr("font-size", 10.5).text(t > 0 ? "+" + t : t));
  svg.append("text").attr("x", w - m.r).attr("y", h - 4).attr("text-anchor", "end").attr("fill", "var(--color-fg-muted)").attr("font-size", 10.5).text(tr("minutes after the official close"));
  for (const s of series) svg.append("path").attr("d", d3.line((d) => x(d[0]), (d) => y(d[1])).curve(d3.curveStepAfter)(s.pts)).attr("fill", "none").attr("stroke", s.color).attr("stroke-width", 2).attr("stroke-linejoin", "round");
  const rule = svg.append("line").attr("y1", m.t).attr("y2", h - m.b).attr("stroke", "var(--cds-chart-axis)").attr("opacity", 0);
  svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", w - m.l - m.r).attr("height", h - m.t - m.b).attr("fill", "transparent")
    .on("mousemove", (ev) => {
      if (!tipEl) return;
      const [mx] = d3.pointer(ev), t = Math.floor(x.invert(mx) / 5) * 5; rule.attr("x1", x(t)).attr("x2", x(t)).attr("opacity", 1);
      tipEl.hidden = false; tipEl.innerHTML = `<div class="bz-t">${t >= 0 ? "+" : ""}${t} ${tr("min after close, still open")}</div>` + series.map((s) => { const p = s.pts.find((q) => q[0] === t); return `<div class="bz-r"><span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${s.color};margin-right:6px"></span>${tr(s.name)}</span><span>${p ? fmtInt(p[2]) : "–"}</span></div>`; }).join("");
      placeTip(tipEl, svgEl.parentElement, ev);
    })
    .on("mouseleave", () => { rule.attr("opacity", 0); if (tipEl) tipEl.hidden = true; });
  return series;
}
function curvesLegend(el, series) {
  el.replaceChildren(...series.map((s) => { const sp = document.createElement("span"); sp.innerHTML = `<span style="display:inline-block;width:14px;height:2px;background:${s.color};vertical-align:middle;margin-right:6px"></span>`; sp.append(tr(s.name) + (s.name === "2026 runoff" ? tr(" (from 17:45)") : "")); return sp; }));
  if (!series.find((s) => s.name === "2026 runoff")) { const p = document.createElement("span"); p.className = "bz-pending"; p.textContent = tr("2026 runoff line: waiting for the TSE file"); el.appendChild(p); }
}

function drawLanes(svgEl) {
  const ex = rows("urna_log_examples"); if (!ex) return;
  const groups = [...new Set(ex.map((r) => r.example))];
  const w = Math.max(320, svgEl.parentElement.clientWidth), lh = 62, m = { l: 12, r: 12, t: 8 }, h = m.t + groups.length * lh + 6;
  const x = d3.scaleLinear([16.5 * 60, 19.25 * 60], [m.l, w - m.r]);
  const svg = d3.select(svgEl).attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%").attr("role", "img").attr("aria-label", "Votes over time in one urna, round 1 and runoff");
  svg.selectAll("*").remove();
  groups.forEach((gname, i) => {
    const g = svg.append("g").attr("transform", `translate(0,${m.t + i * lh})`), pts = ex.filter((r) => r.example === gname);
    g.append("text").attr("x", m.l).attr("y", 10).attr("fill", "var(--color-fg)").attr("font-size", 11.5).text(tr(gname.split(":")[0] === "queue" ? "Round 1, 4 October: queue at 17:00" : "Runoff, 25 October: open, but nobody came"));
    g.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", 30).attr("y2", 30).attr("stroke", "var(--cds-chart-grid)");
    for (const [t, lab] of [[17 * 60, "17:00"], [17 * 60 + 49, "17:49"], [19 * 60, "19:00"]]) { g.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", 18).attr("y2", 42).attr("stroke", "var(--cds-chart-reference)").attr("stroke-dasharray", "2 2"); g.append("text").attr("x", x(t)).attr("y", 54).attr("text-anchor", "middle").attr("fill", "var(--color-fg-muted)").attr("font-size", 10).text(lab); }
    pts.filter((p) => p.kind === "close").forEach((p) => g.append("rect").attr("x", x(N(p.minute_of_day)) - 1.5).attr("y", 18).attr("width", 3).attr("height", 24).attr("fill", S.colors.fg));
    g.append("g").selectAll("circle").data(pts.filter((p) => p.kind === "vote")).join("circle").attr("cx", (p) => x(N(p.minute_of_day))).attr("cy", 30).attr("r", 4).attr("fill", (p) => (N(p.minute_of_day) > 17 * 60 ? S.colors.warn : S.colors.fgm)).attr("stroke", S.colors.panel).attr("stroke-width", 1.2);
  });
}

function extensionPanel(el) {
  const e = rows("extension_view")?.[0]; if (!e) return;
  el.replaceChildren();
  const card = (k, big, txt, src, field) => { const d = document.createElement("div"); d.className = "bz-card"; d.innerHTML = `<span class="bz-cap"></span><span class="bz-big"></span><p class="bz-cap"></p>`; d.children[0].textContent = k; const b = d.children[1]; b.textContent = big; if (src) { b.dataset.source = src; b.dataset.field = field; } d.children[2].textContent = txt; return d; };
  const wrap = document.createElement("div"); wrap.className = "bz-tiles";
  wrap.append(card(tr("Runoff margin"), fmtInt(e.margin), tr("Lula minus Flávio, in votes."), "extension_view", "margin"));
  if (e.status !== "measured") {
    const p = document.createElement("div"); p.className = "bz-card"; p.innerHTML = `<span class="bz-pending">${tr("Waiting for the TSE file")}</span><p class="bz-cap">${tr("The TSE publishes every runoff urna's close time about one day after the vote. Then this panel shows how many sections stayed open after 17:49, their voters, and the result without them.")}</p>`;
    wrap.append(p);
  } else {
    wrap.append(card(tr("Votes after 17:00 in the urnas open late"), fmtInt(e.votes_after_17), LANG === "pt" ? `Nas ${fmtInt(e.urnas_open)} urnas ainda abertas às 17h45. ${fmtInt(e.urnas_with_late)} delas receberam ao menos um voto.` : `In the ${fmtInt(e.urnas_open)} urnas still open at 17:45. ${fmtInt(e.urnas_with_late)} of them got at least one vote.`, "extension_view", "votes_after_17"));
    wrap.append(card(tr("New voters after a pause"), fmtInt(e.after_pause), LANG === "pt" ? `Só possíveis por causa da prorrogação. Os outros ${fmtInt(e.queue)} já estavam na fila às 17h.` : `Possible only because of the extension. The other ${fmtInt(e.queue)} were already in line at 17:00.`, "extension_view", "after_pause"));
    wrap.append(card(tr("Votes after 17:49"), fmtInt(e.votes_after_1749), tr("After the TSE told the sections about the extension."), "extension_view", "votes_after_1749"));
    wrap.append(card(tr("Lula's margin without the late votes"), `${fmtInt(e.margin_min)} – ${fmtInt(e.margin_max)}`, tr("Whatever those votes were, Lula still wins."), "extension_view", "margin_min"));
  }
  el.appendChild(wrap);
  const t = document.getElementById("extText");
  t.textContent = e.status === "measured" ? (LANG === "pt" ? `Nas ${fmtInt(e.urnas_open)} urnas ainda abertas às 17h45, foram computados ${fmtInt(e.votes_after_17)} votos depois das 17h; ${fmtInt(e.after_pause)} deles vieram depois de uma pausa, então só a prorrogação os tornou possíveis. Mesmo que todos fossem para um só candidato, a vantagem de Lula fica entre ${fmtInt(e.margin_min)} e ${fmtInt(e.margin_max)} votos.` : `In the ${fmtInt(e.urnas_open)} urnas still open at 17:45, ${fmtInt(e.votes_after_17)} votes were cast after 17:00; ${fmtInt(e.after_pause)} of them came after a pause, so only the extension made them possible. Even if all of them went to one candidate, Lula's margin stays between ${fmtInt(e.margin_min)} and ${fmtInt(e.margin_max)} votes.`) : tr("The count of sections that stayed open after 17:49 appears here when the TSE publishes the runoff boletim de urna file.");
}

function storyVisual() {
  const v = S.storyView, cv = document.getElementById("storyCanvas"), svg = document.getElementById("storySvg"), lg = document.getElementById("storyLegend"), how = document.getElementById("storyHow");
  const [kind, mode] = v.split(":");
  const ext = document.getElementById("storyExt"), vis = document.getElementById("storyVis");
  cv.hidden = kind !== "br"; svg.toggleAttribute("hidden", kind === "br" || kind === "ext"); ext.hidden = kind !== "ext";
  vis.classList.toggle("bz-fit", kind === "lanes" || kind === "ext");
  lg.replaceChildren(); how.textContent = "";
  if (kind === "br") { drawBrazil(cv, mode, null, null); legend(lg, mode); hatchNote(lg, cv); how.textContent = tr("How to read: ") + tr(MODE[mode].how) + tr(" Hover or tap a state for its numbers."); }
  else if (kind === "world") { drawWorld(svg, mode, "World"); legend(lg, mode, WORLD_MAX); cityBars(lg, mode); how.textContent = tr("How to read: each country is colored by Lula's lead among Brazilians who voted there, all its consulate cities added up. Hover a country for its cities. Explore the map has a zoom for each region."); worldTinyNote(lg, svg); }
  else if (kind === "bars") { drawSwingBars(svg); how.textContent = tr("How to read: a red bar means the gap moved toward Lula in that state. Longer bar, more votes."); }
  else if (kind === "sources") { drawSources(svg); how.textContent = tr("How to read: both bars hold every vote Lula and Flávio gained between the rounds. The top bar splits them by who got them, the bottom bar by where they came from (net). The data cannot say which source went to which candidate."); }
  else if (kind === "curves") { const s = drawCurves(svg, document.getElementById("storyTip")); if (s) curvesLegend(lg, s); how.textContent = tr("How to read: at 0 every urna is still open (100%). The line falls as urnas close. A line far to the right means many urnas stayed open late."); }
  else if (kind === "lanes") { drawLanes(svg); how.textContent = tr("How to read: orange dots are votes after 17:00. A continuous run of dots is a queue; dots after a gap would be new voters."); }
  else if (kind === "ext") { extensionPanel(ext); how.textContent = tr("How to read: counts from the log of every urna still open at 17:45. The range is Lula's margin if every late vote had gone to one candidate."); }
}

function exploreVisual() {
  const cv = document.getElementById("exCanvas"), svg = document.getElementById("exSvg"), lg = document.getElementById("exLegend"), how = document.getElementById("exHow");
  const world = S.exArea === "world";
  cv.hidden = world; svg.toggleAttribute("hidden", !world);
  const extOk = rows("extension_view")?.[0]?.status === "measured";
  document.querySelectorAll("#exMode button").forEach((b) => { b.setAttribute("aria-pressed", String(b.dataset.mode === S.exMode)); b.disabled = (b.dataset.mode === "ext" && (!extOk || world)); b.title = b.disabled ? tr(world ? "Not available for cities abroad" : "Available when the TSE publishes runoff close times") : ""; });
  document.querySelectorAll("#exArea button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.area === S.exArea)));
  document.getElementById("exState").hidden = world; document.getElementById("exSearch").hidden = world;
  const reg = document.getElementById("exRegion"); reg.hidden = !world;
  reg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.region === S.exRegion)));
  if (world) drawWorld(svg, S.exMode, S.exRegion);
  else { const st = S.states.find((s) => s.uf === S.exState); const box = st ? [st.box[0] - 10, st.box[1] - 10, st.box[2] + 10, st.box[3] + 10] : null; drawBrazil(cv, S.exMode, box, S.exMun); }
  legend(lg, S.exMode, world ? WORLD_MAX : undefined); if (!world) hatchNote(lg, cv); else worldTinyNote(lg, svg);
  const loaded = [...S.mun.values()].filter((r) => N(r.r2_lula) != null).length;
  how.textContent = tr(MODE[S.exMode].how) + (world ? "" : S.exState ? tr(" Hover a municipality for its numbers; click it for its own chart.") : tr(" Click a state to zoom in and see its municipalities.")) + (["r2", "sw", "s22", "s18"].includes(S.exMode) && loaded < S.mun.size ? (LANG === "pt" ? ` Resultados do 2º turno carregados para ${fmtInt(loaded)} de ${fmtInt(S.mun.size)} municípios; o restante chega com os arquivos do TSE.` : ` Runoff results loaded for ${fmtInt(loaded)} of ${fmtInt(S.mun.size)} municipalities; the rest fill in as the TSE files arrive.`) : "");
  document.getElementById("exClear").hidden = !S.exState && !S.exMun && !S.exCity;
  detailCard();
}

function detailCard() {
  const el = document.getElementById("exDetail");
  const city = S.exArea === "world" && S.exCity ? (S.abroad.find((a) => a.code === S.exCity) ?? (() => { const c = countryRows().get(S.exCity); return c ? { ...c, city: c.country, country: c.cities.length + tr(c.cities.length === 1 ? " voting city" : " voting cities") } : null; })()) : null;
  const r = city ?? (S.exMun ? S.mun.get(S.exMun) : null);
  el.replaceChildren();
  const h = document.createElement("h2"); el.appendChild(h);
  const sub = document.createElement("p"); sub.className = "bz-cap"; el.appendChild(sub);
  let pts;
  if (r) {
    if (city) { h.textContent = `${cityName(city)}${city.country && !(LANG === "pt" && city.city_pt) ? ", " + city.country : ""}`; sub.textContent = tr("Votes at this city's consulate. PT candidate's share of the two-candidate vote in each election."); }
    else { h.textContent = `${r.name} (${String(r.uf).toUpperCase()})`; sub.textContent = (LANG === "pt" ? `${fmtInt(N(r.electorate))} eleitores aptos. Parcela do candidato do PT nos votos dos dois candidatos em cada eleição.` : `${fmtInt(N(r.electorate))} registered voters. PT candidate's share of the two-candidate vote in each election.`); }
    pts = [["2018", two(N(r.y2018_haddad), N(r.y2018_bolsonaro)), "y2018_haddad"], ["2022", two(N(r.y2022_lula), N(r.y2022_bolsonaro)), "y2022_lula"], ["2026 R1", two(N(r.r1_lula), N(r.r1_flavio)), "r1_lula"], ["2026", two(N(r.r2_lula), N(r.r2_flavio)), "r2_lula"]];
  } else {
    const sc = rows("state_change"), ns = rows("national_shares");
    const s = S.exState && sc ? sc.find((q) => q.uf === S.exState) : null;
    if (s) { h.textContent = s.state; sub.textContent = tr("PT candidate's share of the two-candidate vote in each election. Select a municipality on the map for its own numbers."); pts = [["2018", s.y2018_pt_pct], ["2022", s.y2022_lula_pct], ["2026 R1", two(s.r1_lula_pct, s.r1_flavio_pct)], ["2026", s.r2_lula_pct]]; }
    else if (ns) { const g = (k) => ns.find((q) => q.key === k); h.textContent = tr(S.exArea === "world" ? "Brazilians abroad" : "Brazil"); sub.textContent = tr("PT candidate's share of the two-candidate vote in each election. Select a state or a municipality for its own numbers."); const pre = S.exArea === "world" ? "abroad_" : ""; pts = [["2018", g(pre + "y2018")], ["2022", g(pre + "y2022")], ["2026 R1", g(pre + "r1")], ["2026", g(pre + "r2")]].map(([l, q]) => [l, q ? two(q.left, q.right) : null]); }
    else return;
  }
  const svgNS = "http://www.w3.org/2000/svg", svg = document.createElementNS(svgNS, "svg"); el.appendChild(svg);
  const w = Math.max(240, el.clientWidth - 40), hh = 170, m = { l: 34, r: 16, t: 14, b: 26 };
  const x = d3.scalePoint(pts.map((p) => p[0]), [m.l, w - m.r]), y = d3.scaleLinear([0, 100], [hh - m.b, m.t]);
  const s = d3.select(svg).attr("viewBox", `0 0 ${w} ${hh}`).attr("width", "100%").attr("role", "img").attr("aria-label", "PT share across four elections");
  [0, 25, 50, 75, 100].forEach((v) => { s.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y(v)).attr("y2", y(v)).attr("stroke", v === 50 ? "var(--cds-chart-reference)" : "var(--cds-chart-grid)").attr("stroke-dasharray", v === 50 ? "3 3" : null); s.append("text").attr("x", m.l - 6).attr("y", y(v) + 4).attr("text-anchor", "end").attr("fill", "var(--color-fg-muted)").attr("font-size", 10).text(v + "%"); });
  const valid = pts.filter((p) => p[1] != null);
  s.append("path").attr("d", d3.line((p) => x(p[0]), (p) => y(p[1]))(valid)).attr("fill", "none").attr("stroke", "var(--cds-chart-muted)").attr("stroke-width", 2).attr("stroke-linecap", "round");
  for (const p of pts) {
    s.append("text").attr("x", x(p[0])).attr("y", hh - 6).attr("text-anchor", "middle").attr("fill", "var(--color-fg-muted)").attr("font-size", 10.5).text(tr(p[0]));
    if (p[1] == null) { s.append("text").attr("x", x(p[0])).attr("y", y(50) - 6).attr("text-anchor", "middle").attr("fill", "var(--color-fg-muted)").attr("font-size", 10).text(tr("pending")); continue; }
    s.append("circle").attr("cx", x(p[0])).attr("cy", y(p[1])).attr("r", 5).attr("fill", p[1] >= 50 ? S.colors.red : S.colors.blue).attr("stroke", S.colors.panel).attr("stroke-width", 1.5);
    s.append("text").attr("x", x(p[0])).attr("y", y(p[1]) - 9).attr("text-anchor", "middle").attr("fill", "var(--color-fg)").attr("font-size", 11).text(p[1].toFixed(1).replace(".", DEC) + "%");
  }
  const key = document.createElement("p"); key.className = "bz-cap"; key.textContent = tr("Above the dashed line the PT candidate won; below it the Bolsonaro candidate won. 2026 R1 here uses only the two runoff candidates' votes."); el.appendChild(key);
  if (S.exArea === "world" && !city) cityBars(el, S.exMode, (code) => { S.exCity = code; exploreVisual(); });
}

function stateTable() {
  const sc = rows("state_change"); const tb = document.querySelector("#stateTable tbody"); if (!sc) { tb.replaceChildren(); return; }
  const k = S.sortKey, dir = S.sortDir;
  const data = sc.slice().sort((a, b) => (typeof a[k] === "string" ? a[k].localeCompare(b[k]) : (a[k] ?? -Infinity) - (b[k] ?? -Infinity)) * dir);
  const f = { state: (v) => v, y2018_pt_pct: (v) => FMT.pct1(v), y2022_lula_pct: (v) => FMT.pct1(v), r1_lula_pct: (v) => FMT.pct1(v), r1_flavio_pct: (v) => FMT.pct1(v), r2_lula_pct: (v) => FMT.pct1(v), shift_vs_r1: (v) => FMT.pp(v), margin_change: fmtSigned, late_2022: fmtInt, late_2026_r2: fmtInt };
  tb.replaceChildren(...data.map((r) => { const row = document.createElement("tr"); row.dataset.key = r.uf; if (r.uf === S.exState) row.className = "bz-sel"; for (const c of Object.keys(f)) { const td = document.createElement("td"); td.textContent = r[c] == null ? (c === "late_2026_r2" ? tr("pending") : "–") : f[c](r[c]); row.appendChild(td); } return row; }));
  document.querySelectorAll("#stateTable th").forEach((th) => { th.setAttribute("aria-sort", th.dataset.field === k ? (dir > 0 ? "ascending" : "descending") : "none"); });
}

function timeline() {
  const t = rows("timeline"), ol = document.getElementById("timeline"); if (!t) return;
  let day = ""; ol.replaceChildren();
  for (const e of t) {
    if (e.date !== day) { day = e.date; const li = document.createElement("li"); li.className = "bz-day"; li.textContent = new Date(e.date + "T12:00:00Z").toLocaleDateString(LANG === "pt" ? "pt-BR" : "en-GB", { weekday: "long", day: "numeric", month: "long" }); ol.appendChild(li); }
    const li = document.createElement("li"); if (e.key_moment === true || e.key_moment === "true") li.className = "bz-key";
    const tm = document.createElement("span"); tm.className = "bz-time"; tm.textContent = e.time ?? "";
    const dot = document.createElement("span"); dot.className = "bz-dot";
    const ev = document.createElement("span"); ev.className = "bz-ev"; ev.textContent = (LANG === "pt" && e.event_pt ? e.event_pt : e.event) + " ";
    if (e.sources_differ) { const n = document.createElement("span"); n.className = "bz-note"; n.textContent = tr("Sources differ: ") + (LANG === "pt" && e.sources_differ_pt ? e.sources_differ_pt : e.sources_differ); ev.appendChild(n); }
    const a = document.createElement("a"); a.href = e.source; a.target = "_blank"; a.rel = "noopener"; a.textContent = tr("source"); ev.appendChild(a);
    li.append(tm, dot, ev); ol.appendChild(li);
  }
}

function lateTiles() {
  const lr = rows("late_rates"), el = document.getElementById("lateTiles"); if (!lr) return;
  el.replaceChildren(...["2018 runoff", "2022 runoff", "2026 round 1", "2026 runoff"].map((n) => {
    const r = lr.find((q) => q.election === n), d = document.createElement("div"); d.className = "bz-card";
    const cap = document.createElement("span"); cap.className = "bz-cap"; cap.textContent = tr(n);
    const big = document.createElement("span"); big.className = "bz-big";
    const p = document.createElement("p"); p.className = "bz-cap";
    if (r) { big.textContent = fmtInt(r.very_late); big.dataset.source = "late_rates"; big.dataset.field = "very_late"; big.dataset.where = "election=" + encodeURIComponent(n); p.textContent = r.very_late_pct == null ? tr("urnas still open at 17:49, counted from the urna logs") : (LANG === "pt" ? `de ${fmtInt(r.sections)} seções (${r.very_late_pct.toFixed(2).replace(".", DEC)}%)` : `of ${fmtInt(r.sections)} sections (${r.very_late_pct.toFixed(2).replace(".", DEC)}%)`); }
    else { big.textContent = "—"; p.innerHTML = '<span class="bz-pending">' + tr("Waiting for the TSE file") + '</span>'; }
    d.append(cap, big, p); return d;
  }));
}

const PAT = { saw: "all" };
const patColor = (e) => (e === "2026 runoff" ? S.colors.red : e === "2022 runoff" ? S.colors.fgm : S.colors.list[6 % S.colors.list.length]);
const PAT_YEARS = ["2018 runoff", "2022 runoff", "2026 runoff"];
const PAT_CAND = { "2018 runoff": "Haddad", "2022 runoff": "Lula", "2026 runoff": "Lula" };
function patSeries(election, order) {
  const cc = rows("count_curves"); if (!cc) return [];
  return cc.filter((r) => r.election === election && r.order === order).map((r) => order === "random band" ? [N(r.pct_counted), N(r.pt_share_lo), N(r.pt_share_hi)] : [N(r.pct_counted), N(r.pt_share)]);
}
function patLine(svgEl, tipEl, o) {
  const w = Math.max(260, svgEl.parentElement.clientWidth), h = o.h ?? 260, m = { l: 46, r: o.mr ?? 14, t: 14, b: o.xTitle ? 36 : 22 };
  const x = d3.scaleLinear(o.x, [m.l, w - m.r]), y = d3.scaleLinear(o.y, [h - m.b, m.t]);
  const svg = d3.select(svgEl).attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%").attr("role", "img").attr("aria-label", o.aria ?? "");
  svg.selectAll("*").remove();
  const clip = "pc" + Math.random().toString(36).slice(2);
  svg.append("clipPath").attr("id", clip).append("rect").attr("x", m.l).attr("y", m.t).attr("width", w - m.l - m.r).attr("height", h - m.t - m.b);
  y.ticks(5).forEach((v) => { svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y(v)).attr("y2", y(v)).attr("stroke", "var(--cds-chart-grid)"); svg.append("text").attr("x", m.l - 6).attr("y", y(v) + 4).attr("text-anchor", "end").attr("fill", "var(--color-fg-muted)").attr("font-size", 10.5).text(o.yFmt(v)); });
  (o.xTicks ?? x.ticks(w < 480 ? 4 : 6)).forEach((v) => svg.append("text").attr("x", x(v)).attr("y", h - m.b + 15).attr("text-anchor", "middle").attr("fill", "var(--color-fg-muted)").attr("font-size", 10.5).text(o.xFmt(v)));
  svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", h - m.b).attr("y2", h - m.b).attr("stroke", "var(--cds-chart-axis)");
  if (o.xTitle) svg.append("text").attr("x", w - m.r).attr("y", h - 4).attr("text-anchor", "end").attr("fill", "var(--color-fg-muted)").attr("font-size", 10.5).text(o.xTitle);
  const g = svg.append("g").attr("clip-path", `url(#${clip})`);
  if (o.band?.length) g.append("path").attr("d", d3.area((d) => x(d[0]), (d) => y(d[1]), (d) => y(d[2]))(o.band)).attr("fill", S.colors.mid);
  if (o.ref != null) { svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y(o.ref)).attr("y2", y(o.ref)).attr("stroke", "var(--cds-chart-reference)").attr("stroke-dasharray", "3 3"); if (o.refLabel) svg.append("text").attr("x", w - m.r - 4).attr("text-anchor", "end").attr("y", y(o.ref) - 6).attr("paint-order", "stroke").attr("stroke", "var(--color-panel)").attr("stroke-width", 4).attr("fill", "var(--color-fg-muted)").attr("font-size", 10.5).text(o.refLabel); }
  for (const s of o.series) {
    g.append("path").attr("d", d3.line((d) => x(d[0]), (d) => y(d[1]))(s.pts)).attr("fill", "none").attr("stroke", s.color).attr("stroke-width", s.w ?? 2).attr("stroke-dasharray", s.dash ?? null).attr("stroke-linejoin", "round").attr("opacity", s.op ?? 1);
    if (s.dots) for (const d of s.pts) g.append("circle").attr("cx", x(d[0])).attr("cy", y(d[1])).attr("r", 3.5).attr("fill", s.color).attr("stroke", "var(--color-panel)").attr("stroke-width", 1.5);
  }
  if (!tipEl) return;
  const hov = o.series.filter((s) => s.tip);
  const rule = svg.append("line").attr("y1", m.t).attr("y2", h - m.b).attr("stroke", "var(--cds-chart-axis)").attr("opacity", 0);
  const marks = hov.map((s) => svg.append("circle").attr("r", 4).attr("fill", s.color).attr("stroke", "var(--color-panel)").attr("stroke-width", 2).attr("opacity", 0));
  const near = (pts, v) => { const i = d3.bisector((d) => d[0]).center(pts, v); return pts[i]; };
  svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", w - m.l - m.r).attr("height", h - m.t - m.b).attr("fill", "transparent")
    .on("pointermove", (ev) => {
      const v = x.invert(d3.pointer(ev)[0]); let at = v;
      const lines = hov.map((s, i) => { const p = near(s.pts, v); if (!p) return ""; at = p[0]; marks[i].attr("cx", x(p[0])).attr("cy", y(p[1])).attr("opacity", 1); return `<div class="bz-r"><span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${s.color};margin-right:6px"></span>${s.tip}</span><span>${o.tipVal(p[1])}</span></div>${o.tipMore ? o.tipMore(p, s) : ""}`; });
      rule.attr("x1", x(at)).attr("x2", x(at)).attr("opacity", 1);
      tipEl.hidden = false; tipEl.innerHTML = `<div class="bz-t">${o.tipTitle(at)}</div>` + lines.join("");
      placeTip(tipEl, svgEl.parentElement, ev);
    })
    .on("pointerleave", () => { rule.attr("opacity", 0); marks.forEach((c) => c.attr("opacity", 0)); tipEl.hidden = true; });
}
const pctAxis = (v) => String(v).replace(".", DEC) + "%";
function patLegend(el, items) {
  el.replaceChildren(...items.map((it) => { const sp = document.createElement("span"); sp.innerHTML = `<span style="display:inline-block;width:14px;height:${it.box ? 10 : 2}px;background:${it.dash ? `repeating-linear-gradient(90deg,${it.color} 0 4px,transparent 4px 7px)` : it.color};vertical-align:middle;margin-right:6px"></span>`; sp.append(it.label); return sp; }));
}
function drawPatSame() {
  const series = PAT_YEARS.map((e) => {
    const raw = patSeries(e, "2026 order"), fin = raw.length ? raw[raw.length - 1][1] : 0;
    return { color: patColor(e), w: e === "2026 runoff" ? 2.5 : 2, tip: `${e.slice(0, 4)} · ${PAT_CAND[e]}`, pts: raw.filter((p) => p[0] >= 0.6).map((p) => [p[0], p[1] - fin]) };
  });
  if (!series[0].pts.length) return;
  patLine(document.getElementById("patSameSvg"), document.getElementById("patSameTip"), {
    x: [0, 100], y: [-3, 1], h: 300, series, ref: 0, refLabel: tr("final result"),
    xFmt: (v) => v + "%", yFmt: (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v) + " pp", xTitle: tr("urnas counted, in the order they arrived in 2026"),
    tipTitle: (v) => FMT.pct1(v) + " " + tr("of urnas"), tipVal: FMT.pp, aria: "PT share minus its final result for 2018, 2022 and 2026, replayed in the 2026 arrival order",
  });
  patLegend(document.getElementById("patSameLegend"), PAT_YEARS.map((e) => ({ color: patColor(e), label: `${e.slice(0, 4)} · ${PAT_CAND[e]}` })));
}
function drawPatReal() {
  const host = document.getElementById("patReal");
  const panels = PAT_YEARS.map((e) => {
    let box = host.querySelector(`[data-e="${e}"]`);
    if (!box) { box = document.createElement("div"); box.className = "bz-vis bz-fit"; box.dataset.e = e; box.innerHTML = `<h3></h3><svg></svg><div class="bz-tip" hidden></div>`; host.appendChild(box); }
    box.querySelector("h3").textContent = `${e.slice(0, 4)} · ${PAT_CAND[e]}`;
    return { e, box };
  });
  for (const { e, box } of panels) {
    const recv = patSeries(e, "receive"), band = patSeries(e, "random band"), rnd = patSeries(e, "random"), same = patSeries(e, "2026 order");
    if (!rnd.length) continue;
    const fin = rnd[rnd.length - 1][1];
    const series = [{ pts: rnd.filter((p) => p[0] >= 0.2), color: S.colors.muted, w: 1.5, tip: tr("random order") }];
    if (recv.length) series.push({ pts: recv.filter((p) => p[0] >= 0.2), color: S.colors.red, w: 2.5, tip: tr("real order") });
    else series.push({ pts: same.filter((p) => p[0] >= 0.2), color: S.colors.fgm, w: 2, dash: "5 3", tip: tr("2026 order") });
    patLine(box.querySelector("svg"), box.querySelector(".bz-tip"), {
      x: [0, 100], y: [Math.floor(fin - 8), Math.ceil(fin + 4)], h: 220, series, band, ref: fin, xTicks: [0, 25, 50, 75, 100],
      xFmt: (v) => v + "%", yFmt: pctAxis, tipTitle: (v) => FMT.pct1(v) + " " + tr("of urnas"), tipVal: FMT.pct, aria: `Running PT share in ${e}, real order against random orders`,
    });
  }
  patLegend(document.getElementById("patRealLegend"), [
    { color: S.colors.red, label: tr("real count") }, { color: S.colors.mid, label: tr("where a random order would stay"), box: true },
    { color: S.colors.muted, label: tr("one random order") }, { color: S.colors.fgm, label: tr("2018 votes in the 2026 order"), dash: true },
  ]);
}
function drawPatSaw() {
  document.querySelectorAll("#patSawMode button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === PAT.saw)));
  const cs = rows("count_sawtooth"); if (!cs) return;
  const host = document.getElementById("patSaw"), zoom = PAT.saw === "zoom";
  const panels = ["2022 runoff", "2026 runoff"].map((e) => {
    let box = host.querySelector(`[data-e="${e}"]`);
    if (!box) { box = document.createElement("div"); box.className = "bz-vis bz-fit"; box.dataset.e = e; box.innerHTML = `<h3></h3><svg></svg><div class="bz-tip" hidden></div>`; host.appendChild(box); }
    box.querySelector("h3").textContent = `Acre ${e.slice(0, 4)} · ${PAT_CAND[e]}`;
    return { e, box };
  });
  for (const { e, box } of panels) {
    const all = cs.filter((r) => r.election === e).map((r) => [N(r.votes_counted), N(r.pt_running_share), N(r.pt_urna_share), r.municipality]);
    const [x0, x1] = zoom ? [60000, 80000] : [0, all[all.length - 1][0]];
    const pts = all.filter((p) => p[0] >= x0 && p[0] <= x1), ys = pts.filter((p) => p[0] >= (zoom ? x0 : 15000)).map((p) => p[1]);
    patLine(box.querySelector("svg"), box.querySelector(".bz-tip"), {
      x: [x0, x1], y: [Math.floor(d3.min(ys) - 0.5), Math.ceil(d3.max(ys) + 0.5)], h: 230, series: [{ pts, color: S.colors.red, tip: tr("running share") }],
      xFmt: (v) => Math.round(v / 1000) + "k", yFmt: pctAxis, xTitle: tr("valid votes counted, TSE file order"),
      tipTitle: (v) => fmtInt(Math.round(v)) + " " + tr("votes"), tipVal: FMT.pct,
      tipMore: (p) => `<div class="bz-r"><span>${p[3]}</span><span>${tr("this urna")} ${FMT.pct0(p[2])}</span></div>`, aria: `Running PT share in Acre ${e} in TSE file order`,
    });
  }
}
function drawPatSamples() {
  const cs = rows("count_samples"); if (!cs) return;
  const by = d3.groups(cs, (r) => N(r.sample)).map(([k, v]) => [k, v.map((r) => [N(r.urnas_counted), N(r.pt_share)])]);
  const fin = patSeries("2026 runoff", "receive").at(-1)?.[1];
  const series = by.filter(([k]) => k !== 1).map(([, pts]) => ({ pts, color: S.colors.muted, w: 1.2 }));
  series.push({ pts: by.find(([k]) => k === 1)[1], color: S.colors.red, w: 2.5, tip: tr("highlighted sample") });
  patLine(document.getElementById("patSampleSvg"), document.getElementById("patSampleTip"), {
    x: [1, 472], y: [40, 64], h: 260, series, ref: fin, refLabel: fin != null ? tr("national result") + " " + FMT.pct1(fin) : null, xTicks: [1, 100, 200, 300, 400, 472],
    xFmt: (v) => String(v), yFmt: pctAxis, xTitle: tr("urnas added, in random order"), tipTitle: (v) => Math.round(v) + " " + tr("urnas"), tipVal: FMT.pct1, aria: "Running PT share for 20 random samples of 472 urnas",
  });
}
function patterns() { drawPatReal(); drawPatSame(); drawPatSaw(); drawPatSamples(); }
for (const [id, key, ev] of [["patSawMode", "saw", "pattern_range_changed"]])
  document.querySelectorAll(`#${id} button`).forEach((b) => b.addEventListener("click", () => { PAT[key] = b.dataset.mode; track(ev, { value: PAT[key] }); patterns(); }));

function loadNote() {
  const loaded = [...S.mun.values()].filter((r) => N(r.r2_lula) != null).length, el = document.getElementById("loadNote");
  el.textContent = S.mun.size && loaded < S.mun.size ? (LANG === "pt" ? `Resultados do 2º turno carregados para ${fmtInt(loaded)} de ${fmtInt(S.mun.size)} municípios. Áreas esmaecidas mostram o resultado do estado até o delas chegar. Os totais nacional e estaduais estão completos.` : `Runoff results are loaded for ${fmtInt(loaded)} of ${fmtInt(S.mun.size)} municipalities. Faded areas show their state result until theirs arrives. National and state totals are complete.`) : "";
}

function showPage(p, fromLink) {
  S.page = p;
  document.querySelectorAll(".bz-tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.page === p)));
  document.querySelectorAll(".bz-page").forEach((s) => (s.hidden = s.id !== p));
  if (!fromLink) dash.setLink(p);
  track("tab_viewed", { tab: p, via: fromLink ? "link" : "click" });
  redraw();
}
document.querySelectorAll(".bz-tabs button").forEach((b) => b.addEventListener("click", () => showPage(b.dataset.page)));

document.querySelectorAll("#exMode button").forEach((b) => b.addEventListener("click", () => { S.exMode = b.dataset.mode; track("map_view_changed", { view: S.exMode, area: S.exArea }); exploreVisual(); }));
document.querySelectorAll("#exArea button").forEach((b) => b.addEventListener("click", () => { S.exArea = b.dataset.area; track("map_area_changed", { area: S.exArea }); if (S.exArea === "world" && S.exMode === "ext") S.exMode = "r2"; S.exMun = null; S.exState = null; S.exCity = null; S.exRegion = "World"; exploreVisual(); stateTable(); }));
document.getElementById("exState").addEventListener("change", (e) => { S.exState = e.target.value || null; if (S.exState) track("state_selected", { uf: S.exState, via: "menu" }); S.exMun = null; exploreVisual(); stateTable(); });
document.getElementById("exSearch").addEventListener("change", (e) => {
  const v = e.target.value, m = v.match(/^(.*) \(([A-Z]{2})\)$/); if (!m) return;
  const r = [...S.mun.values()].find((q) => q.name === m[1] && String(q.uf).toUpperCase() === m[2]); if (!r) return;
  S.exMun = String(r.ibge); S.exState = r.uf; document.getElementById("exState").value = r.uf; track("municipality_selected", { ibge: S.exMun, name: r.name, uf: r.uf, via: "search" }); exploreVisual(); stateTable();
});
document.getElementById("exClear").addEventListener("click", () => { S.exCity = null; S.exMun = null; S.exState = null; document.getElementById("exState").value = ""; document.getElementById("exSearch").value = ""; exploreVisual(); stateTable(); });
document.querySelector("#stateTable tbody").addEventListener("click", (e) => { const tr = e.target.closest("tr[data-key]"); if (!tr) return; S.exState = tr.dataset.key; S.exMun = null; track("state_selected", { uf: tr.dataset.key, via: "table" }); document.getElementById("exState").value = tr.dataset.key; exploreVisual(); stateTable(); document.getElementById("exVis").scrollIntoView({ block: "nearest" }); });
document.querySelectorAll("#sourcesTable th button").forEach((b) => b.addEventListener("click", () => { const k = b.parentElement.dataset.field; S.srcDir = S.srcKey === k ? -S.srcDir : -1; S.srcKey = k; track("table_sorted", { table: "vote_sources", column: k }); sourcesTable(); }));
document.querySelectorAll("#stateTable th button").forEach((b) => b.addEventListener("click", () => { const k = b.parentElement.dataset.field; S.sortDir = S.sortKey === k ? -S.sortDir : -1; S.sortKey = k; track("table_sorted", { table: "states", column: k }); stateTable(); }));

function hitHtml(hit) {
  if (!hit) return null;
  if (hit.kind === "state") return tipHtmlState(hit.id);
  const r = S.mun.get(hit.id); return r ? tipHtmlMun(r) : null;
}
function wireHover(canvas, tip, box, onClick) {
  const show = (ev) => { const h = hitHtml(pickAt(canvas, ev)); if (!h) { tip.hidden = true; return; } tip.innerHTML = h; tip.hidden = false; placeTip(tip, box, ev); };
  canvas.addEventListener("mousemove", (ev) => { show(ev); const hit = pickAt(canvas, ev); canvas.style.cursor = onClick && hit ? "pointer" : "default"; });
  canvas.addEventListener("mouseleave", () => (tip.hidden = true));
  canvas.addEventListener("click", (ev) => { const hit = pickAt(canvas, ev); if (onClick && hit) { tip.hidden = true; onClick(hit); } else show(ev); });
}
function tipHtmlState(uf) {
  const st = rows("states")?.find((q) => q.uf === uf), sc = rows("state_change")?.find((q) => q.uf === uf);
  if (!st) return null;
  const row = (k, v) => `<div class="bz-r"><span>${k}</span><span>${v}</span></div>`;
  const sh = (a, b) => { const v = two(N(a), N(b)); return v == null ? "–" : `${v.toFixed(1).replace(".", DEC)}% / ${(100 - v).toFixed(1).replace(".", DEC)}%`; };
  let h = `<div class="bz-t">${st.state} · ${String(uf).toUpperCase()}</div>`;
  h += row(tr("2018 Haddad / Bolsonaro"), sh(st.y2018_haddad, st.y2018_bolsonaro));
  h += row(tr("2022 Lula / Bolsonaro"), sh(st.y2022_lula, st.y2022_bolsonaro));
  h += row(tr("2026 R1 Lula / Flávio"), `${((100 * N(st.r1_lula)) / N(st.r1_valid)).toFixed(1).replace(".", DEC)}% / ${((100 * N(st.r1_flavio)) / N(st.r1_valid)).toFixed(1).replace(".", DEC)}%`);
  h += row(tr("2026 runoff Lula / Flávio"), sh(st.r2_lula, st.r2_flavio));
  if (sc?.margin_change != null) h += row(tr("Gap change since round 1"), fmtSigned(sc.margin_change));
  return h;
}
wireHover(document.getElementById("storyCanvas"), document.getElementById("storyTip"), document.getElementById("storyVis"));
wireHover(document.getElementById("exCanvas"), document.getElementById("exTip"), document.getElementById("exVis"), (hit) => {
  if (hit.kind === "state") { S.exState = hit.id; S.exMun = null; track("state_selected", { uf: hit.id, via: "map" }); }
  else { const r = S.mun.get(hit.id); S.exMun = hit.id; S.exState = r?.uf ?? S.exState; track("municipality_selected", { ibge: hit.id, name: r?.name, uf: r?.uf, via: "map" }); }
  document.getElementById("exState").value = S.exState ?? ""; exploreVisual(); stateTable();
});
function wireWorldHover(svgEl, tip, box, onPick) {
  const hit = (ev) => { const p = ev.target.closest("path.bz-country"); if (!p) return null; const d = d3.select(p).datum(); return svgEl._byIso?.get(d.iso) ?? null; };
  if (onPick) svgEl.addEventListener("click", (ev) => { const c = hit(ev); if (c) onPick(c.iso); });
  svgEl.addEventListener("mousemove", (ev) => { const c = hit(ev); if (!c) { tip.hidden = true; return; } tip.innerHTML = countryTip(c); tip.hidden = false; placeTip(tip, box, ev); });
  svgEl.addEventListener("mouseleave", () => (tip.hidden = true));
}
wireWorldHover(document.getElementById("storySvg"), document.getElementById("storyTip"), document.getElementById("storyVis"));
wireWorldHover(document.getElementById("exSvg"), document.getElementById("exTip"), document.getElementById("exVis"), (code) => { S.exCity = code; track("abroad_selected", { code, name: (S.abroad.find((a) => a.code === code) ?? countryRows().get(code))?.city ?? countryRows().get(code)?.country, via: "map" }); exploreVisual(); });
document.querySelectorAll("#exRegion button").forEach((b) => b.addEventListener("click", () => { S.exRegion = b.dataset.region; track("world_region_selected", { region: S.exRegion }); exploreVisual(); }));

function activeStep() {
  if (S.page !== "story") return;
  const steps = [...document.querySelectorAll(".bz-step")], stick = document.querySelector(".bz-stick");
  const narrow = matchMedia("(max-width: 860px)").matches, top = narrow && stick ? Math.max(0, stick.getBoundingClientRect().bottom) : 0;
  const mid = top + (window.innerHeight - top) / 2;
  let best = steps[0], dist = Infinity;
  for (const st of steps) { const r = st.getBoundingClientRect(); const d = Math.abs((r.top + r.bottom) / 2 - mid); if (r.bottom > 0 && r.top < window.innerHeight && d < dist) { dist = d; best = st; } }
  steps.forEach((st) => st.classList.toggle("bz-on", st === best));
  if (S.lastStep !== best.id) { S.lastStep = best.id; track("story_chapter_reached", { chapter: best.id, number: steps.indexOf(best) + 1 }); }
  if (S.storyView !== best.dataset.view) { S.storyView = best.dataset.view; if (S.prepared) storyVisual(); }
}
let stepQueued = false;
document.addEventListener("scroll", () => { if (stepQueued) return; stepQueued = true; requestAnimationFrame(() => { stepQueued = false; activeStep(); }); }, { capture: true, passive: true });
window.addEventListener("resize", activeStep);

function fillStateSelect() {
  const sc = rows("state_change"), sel = document.getElementById("exState"); if (!sc || sel.dataset.lang === LANG) return; sel.dataset.lang = LANG; const keep = sel.value;
  sel.replaceChildren(new Option(tr("All states"), ""), ...sc.slice().sort((a, b) => a.state.localeCompare(b.state)).map((s) => new Option(s.state, s.uf))); sel.value = S.exState ?? keep ?? "";
}

const I18N_EL = [];
document.querySelectorAll(".bz h1, .bz h2, .bz h3, .bz p, .bz li, .bz button, .bz th, .bz span.bz-k, .bz .bz-ctrlrow > span").forEach((el) => { const en = el.innerHTML.trim(); if (PT_MARKUP[en] != null) I18N_EL.push([el, en]); });
function applyLang(l) {
  LANG = l === "pt" ? "pt" : "en"; DEC = LANG === "pt" ? "," : ".";
  for (const [el, en] of I18N_EL) el.innerHTML = LANG === "pt" ? PT_MARKUP[en] : en;
  document.getElementById("exSearch").placeholder = tr("Find a municipality");
  document.querySelectorAll(".bz-lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === LANG)));
  document.documentElement.lang = LANG === "pt" ? "pt-BR" : "en";
}
document.querySelectorAll(".bz-lang button").forEach((b) => b.addEventListener("click", () => {
  applyLang(b.dataset.lang); dash.setParams({ lang: LANG }); track("language_changed", { lang: LANG });
  bindValues(); fillStateSelect(); loadNote(); extensionPanel(document.getElementById("extCards")); redraw();
}));
let langSet = false;
let linked = false;
function redraw() {
  if (!S.prepared) return;
  if (S.page === "story") storyVisual();
  if (S.page === "explore") { exploreVisual(); stateTable(); sourcesTable(); }
  if (S.page === "patterns") patterns();
  if (S.page === "day") { timeline(); lateTiles(); const s = drawCurves(document.getElementById("curvesSvg"), document.getElementById("curvesTip")); if (s) curvesLegend(document.getElementById("curvesLegend"), s); drawLanes(document.getElementById("lanesSvg")); drawLateMinutes(document.getElementById("lateMinutesSvg"), document.getElementById("lateMinutesTip")); lateStatesTable(); extensionPanel(document.getElementById("extCards")); }
}

dash.onData(() => {
  if (!langSet) { langSet = true; const p = dash.params().lang; applyLang(p ?? "pt"); }
  S.colors = themeColors();
  bindValues();
  if (!prepare()) return;
  indexData(); fillStateSelect(); loadNote(); extensionPanel(document.getElementById("extCards"));
  if (!linked) { linked = true; const h = location.hash.slice(1); if (["story", "explore", "day", "patterns", "method"].includes(h)) { showPage(h, true); return; } }
  redraw();
});

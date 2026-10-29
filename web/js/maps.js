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
function wireWorldHover(svgEl, tip, box, onPick) {
  const hit = (ev) => { const p = ev.target.closest("path.bz-country"); if (!p) return null; const d = d3.select(p).datum(); return svgEl._byIso?.get(d.iso) ?? null; };
  if (onPick) svgEl.addEventListener("click", (ev) => { const c = hit(ev); if (c) onPick(c.iso); });
  svgEl.addEventListener("mousemove", (ev) => { const c = hit(ev); if (!c) { tip.hidden = true; return; } tip.innerHTML = countryTip(c); tip.hidden = false; placeTip(tip, box, ev); });
  svgEl.addEventListener("mouseleave", () => (tip.hidden = true));
}

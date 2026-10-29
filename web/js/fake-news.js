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

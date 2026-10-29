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

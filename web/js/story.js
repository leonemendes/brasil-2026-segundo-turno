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

wireHover(document.getElementById("storyCanvas"), document.getElementById("storyTip"), document.getElementById("storyVis"));
wireWorldHover(document.getElementById("storySvg"), document.getElementById("storyTip"), document.getElementById("storyVis"));
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

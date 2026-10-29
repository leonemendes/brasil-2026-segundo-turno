function sourcesTable() {
  const vs = rows("vote_sources"), tb = document.querySelector("#sourcesTable tbody"); if (!vs) { tb.replaceChildren(); return; }
  const k = S.srcKey, dir = S.srcDir;
  const data = vs.filter((r) => r.uf !== "br").sort((a, b) => (k === "area" ? String(tr(a.area)).localeCompare(String(tr(b.area))) : N(a[k]) - N(b[k])) * dir);
  const cols = ["area", "gain_lula", "gain_flavio", "from_other_candidates", "from_turnout", "from_fewer_blank_null"];
  const mk = (r, bold) => { const row = document.createElement("tr"); row.dataset.key = r.uf; if (bold) row.style.fontWeight = "600"; for (const c of cols) { const td = document.createElement("td"); td.textContent = c === "area" ? tr(r.area) : (c.startsWith("gain") ? fmtSigned(N(r[c])) : fmtInt(N(r[c]))); row.appendChild(td); } return row; };
  tb.replaceChildren(mk(vs.find((r) => r.uf === "br"), true), ...data.map((r) => mk(r, false)));
  document.querySelectorAll("#sourcesTable th").forEach((th) => th.setAttribute("aria-sort", th.dataset.field === k ? (dir > 0 ? "ascending" : "descending") : "none"));
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

function loadNote() {
  const loaded = [...S.mun.values()].filter((r) => N(r.r2_lula) != null).length, el = document.getElementById("loadNote");
  el.textContent = S.mun.size && loaded < S.mun.size ? (LANG === "pt" ? `Resultados do 2º turno carregados para ${fmtInt(loaded)} de ${fmtInt(S.mun.size)} municípios. Áreas esmaecidas mostram o resultado do estado até o delas chegar. Os totais nacional e estaduais estão completos.` : `Runoff results are loaded for ${fmtInt(loaded)} of ${fmtInt(S.mun.size)} municipalities. Faded areas show their state result until theirs arrives. National and state totals are complete.`) : "";
}

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

wireHover(document.getElementById("exCanvas"), document.getElementById("exTip"), document.getElementById("exVis"), (hit) => {
  if (hit.kind === "state") { S.exState = hit.id; S.exMun = null; track("state_selected", { uf: hit.id, via: "map" }); }
  else { const r = S.mun.get(hit.id); S.exMun = hit.id; S.exState = r?.uf ?? S.exState; track("municipality_selected", { ibge: hit.id, name: r?.name, uf: r?.uf, via: "map" }); }
  document.getElementById("exState").value = S.exState ?? ""; exploreVisual(); stateTable();
});
wireWorldHover(document.getElementById("exSvg"), document.getElementById("exTip"), document.getElementById("exVis"), (code) => { S.exCity = code; track("abroad_selected", { code, name: (S.abroad.find((a) => a.code === code) ?? countryRows().get(code))?.city ?? countryRows().get(code)?.country, via: "map" }); exploreVisual(); });
document.querySelectorAll("#exRegion button").forEach((b) => b.addEventListener("click", () => { S.exRegion = b.dataset.region; track("world_region_selected", { region: S.exRegion }); exploreVisual(); }));

function fillStateSelect() {
  const sc = rows("state_change"), sel = document.getElementById("exState"); if (!sc || sel.dataset.lang === LANG) return; sel.dataset.lang = LANG; const keep = sel.value;
  sel.replaceChildren(new Option(tr("All states"), ""), ...sc.slice().sort((a, b) => a.state.localeCompare(b.state)).map((s) => new Option(s.state, s.uf))); sel.value = S.exState ?? keep ?? "";
}

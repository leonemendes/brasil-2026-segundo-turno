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

// Build the visual monthly progress report from a progress data file.
// Usage: node render-progress.mjs progress-data.json [out-dir]
// The data shape is documented in references/progress-method.md; example-progress-v7.json is a full example.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { C, md, esc, band, pillarChart, waterfall, lenses, dots, itemBars, gantt, trend, scopeBars, ciChart, disciplineBars } from './charts.mjs';
import { PILLARS as V7, CHECKS, RESULT_POINTS, wilson, RESULT_LABEL } from './scoring.mjs';
import { page, head, section, cover, definitionsPage, checks, statStrip, waffle, progRows, dotList, steps, swimlane, rhythm, callout, table, caveats } from './components.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [, , dataPath, outDir] = process.argv;
if (!dataPath) { console.error('Usage: node render-progress.mjs progress-data.json [out-dir]'); process.exit(1); }
let D;
try { D = JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch (e) { console.error(`The progress data file isn't valid JSON: ${e.message}`); process.exit(1); }
const fail = (m) => { console.error(m); process.exit(1); };
process.on('uncaughtException', (e) => fail(`The report couldn't be drawn: ${e.message}. Check the data file against references/progress-method.md.`));
const OUT = path.resolve(outDir || path.dirname(dataPath));
fs.mkdirSync(OUT, { recursive: true });

const M = D.meta, S = D.story || {};
const B = D.scores.baseline, N = D.scores.current;
// Re-audit rule: never compare across scoring models without rescoring.
if (!B.modelVersion || !N.modelVersion) { console.error('Both scores.baseline and scores.current must carry modelVersion (copy it from each audit’s .scores.json).'); process.exit(1); }
if (B.modelVersion !== N.modelVersion) { console.error(`Baseline is model ${B.modelVersion} and current is ${N.modelVersion}. Rescore the baseline on the current model first.`); process.exit(1); }
const v7 = N.modelVersion.startsWith('7');
if (M.modelVersion && M.modelVersion !== N.modelVersion) fail(`meta.modelVersion is ${M.modelVersion} but the score data is model ${N.modelVersion}.`);
M.modelVersion = N.modelVersion;
const need = v7 ? ['os', 'td', 'bq'] : ['tc', 'cd', 'oa'];
for (const [side, sc] of [['baseline', B], ['current', N]]) {
  if (!sc.pillars || (v7 ? (!sc.disciplines || !sc.checks || !sc.gates) : !need.every((k) => sc.pillars[k] != null))) fail(`scores.${side} says model ${sc.modelVersion} but doesn't have that model's pillars, disciplines and checks. Copy it unchanged from the audit's .scores.json.`);
}
if (v7 && D.citation) fail('A v7 progress file reports visibility under "visibility", not "citation" (v6 only).');
const VB = D.visibility?.baseline, VN = D.visibility?.current;
if (VB && VN && VB.tier !== VN.tier) fail('Baseline and current visibility use different tiers (measured vs search-proxy). They can’t be compared.');
if (VN?.tier === 'measured') for (const e of [...VN.engines, ...(VB?.engines || [])]) if (!(e.se > 0)) fail(`Visibility for ${e.engine} has no standard error. Re-render that audit with the current scoring.mjs and copy its .scores.json.`);
if (D.citation && D.citation.baseline && D.citation.current && (D.citation.baseline.tier || 'measured') !== (D.citation.current.tier || 'measured')) fail('Baseline and current citation checks use different tiers. They can’t be compared.');
const PILLARS = v7 ? V7.map((p) => [p.key, p.name, p.weight, p.short])
  : [['cd', 'Content Density', 25, 'Content'], ['tc', 'Technical Crawlability', 25, 'Technical'], ['oa', 'Off-Page Consensus', 25, 'Off-page'], ['pm', 'Performance', 10, 'Perf.'], ['se', 'Schema & Entity', 15, 'Schema']];
// Check-level change, only over checks assessed in both audits.
const assessed = (r) => r && !['unverifiable', 'na'].includes(r);
const rawB = B.total, rawN = N.total;
let live = PILLARS.filter(([k]) => B.pillars[k] != null && N.pillars[k] != null);
if (v7) {
  // Like-for-like: recompute each pillar and the index over checks assessed in both audits only,
  // so checks that merely became verifiable don't count as progress.
  const common = Object.keys(N.checks).filter((id) => CHECKS[id] && CHECKS[id][0] !== 'cm' && assessed(B.checks[id]) && assessed(N.checks[id]));
  const pillarOn = (side, k) => { const ids = common.filter((id) => CHECKS[id][0] === k); return ids.length ? (100 * ids.reduce((a, id) => a + RESULT_POINTS[side.checks[id]], 0)) / ids.length : null; };
  B.pillars = Object.fromEntries(PILLARS.map(([k]) => [k, pillarOn(B, k)]).filter(([, v]) => v != null).map(([k, v]) => [k, Math.round(v)]));
  N.pillars = Object.fromEntries(PILLARS.map(([k]) => [k, pillarOn(N, k)]).filter(([, v]) => v != null).map(([k, v]) => [k, Math.round(v)]));
  live = PILLARS.filter(([k]) => B.pillars[k] != null && N.pillars[k] != null);
  const ws = live.reduce((a, p) => a + p[2], 0);
  const idx = (side) => live.reduce((a, [k, , w]) => a + side.pillars[k] * w, 0) / ws;
  const failedGate = (side) => Object.values(side.gates || {}).includes('fail');
  const capB = failedGate(B) ? Math.min(idx(B), 49) : idx(B), capN = failedGate(N) ? Math.min(idx(N), 49) : idx(N);
  B.total = Math.round(capB); N.total = Math.round(capN);
  B.lflUncapped = idx(B); N.lflUncapped = idx(N);
  const leftOut = PILLARS.filter(([k]) => !live.find((l) => l[0] === k) && (B.checks && Object.keys(N.checks).some((id) => CHECKS[id]?.[0] === k && (assessed(B.checks[id]) || assessed(N.checks[id]))))).map((p) => p[1]);
  M.scopeNote = `${M.scopeNote || ''}${leftOut.length ? ` ${leftOut.join(', ')} had no checks assessed in both audits and is left out.` : ''} Compared like for like on the ${common.length} checks assessed in both audits (raw index ${rawB ?? `range ${B.range?.join('–')}`} then, ${rawN ?? `range ${N.range?.join('–')}`} now, including measurement change).`.trim();
}
const wsum = live.reduce((a, p) => a + p[2], 0);
const heavyLeftOut = v7 ? PILLARS.filter(([k, , w]) => k !== 'px' && w >= 20 && !live.find((l) => l[0] === k)).map((p) => p[1]) : [];
const rank = { notmet: 0, partial: 1, met: 2 };
const flips = { better: [], worse: [], newlySeen: [] };
if (v7 && B.checks && N.checks) for (const id of Object.keys(N.checks)) {
  const b = B.checks[id], n = N.checks[id];
  if (assessed(b) && assessed(n) && rank[n] !== rank[b]) (rank[n] > rank[b] ? flips.better : flips.worse).push(`${id} ${RESULT_LABEL[b]} → ${RESULT_LABEL[n]}`);
  else if (!assessed(b) && assessed(n)) flips.newlySeen.push(`${id} now ${RESULT_LABEL[n].toLowerCase()}`);
}
const rows = live.map(([k, name, weight, short]) => ({ name, weight: Math.round((1000 * weight) / wsum) / 10, short, prev: B.pillars[k], score: N.pillars[k] }));
const steps_ = rows.map((r) => ({ name: r.short, delta: ((r.score - r.prev) * r.weight) / 100 }));
if (v7 && (B.total !== Math.round(B.lflUncapped) || N.total !== Math.round(N.lflUncapped))) steps_.push({ name: 'Gate cap', delta: (N.total - N.lflUncapped) - (B.total - B.lflUncapped) });
const dims = v7
  ? ['SEO', 'AEO', 'GEO'].map((k) => ({ k, name: { SEO: 'Search', AEO: 'Answers', GEO: 'AI assistants' }[k], prevMet: B.disciplines?.[k]?.[0], prevOf: B.disciplines?.[k]?.[1], met: N.disciplines?.[k]?.[0], of: N.disciplines?.[k]?.[1], detail: N.disciplinesDetail?.[k] }))
  : [['SEO', 'seo', 'Search'], ['AEO', 'aeo', 'Answers'], ['GEO', 'geo', 'AI assistants']].map(([k, key, name]) => ({ k, name, prev: B[key], score: N[key] }));
const flipLine = v7 && B.checks ? `Checks assessed in both audits: ${flips.better.length} improved${flips.better.length ? ` (${flips.better.join(', ')})` : ''}, ${flips.worse.length} worsened${flips.worse.length ? ` (${flips.worse.join(', ')})` : ''}.${flips.newlySeen.length ? ` ${flips.newlySeen.length} became verifiable (${flips.newlySeen.join(', ')}); that part of the move is measurement, not progress.` : ''}` : '';
let n = 0; const num = () => String(++n).padStart(2, '0');
const parts = [];
const sumDelta = steps_.reduce((a, s) => a + s.delta, 0);

// ---------- cover + definitions ----------
parts.push(cover({
  kicker: `${M.domain} · search visibility · progress report`, domain: `${M.baselineDate} → ${M.date}`, score: N.total, prev: B.total,
  capped: v7 && Object.values(N.gates || {}).includes('fail'),
  note: v7 && heavyLeftOut.length ? `excludes ${heavyLeftOut.join(', ').toLowerCase()} (not assessed in both audits)` : null,
  scoreLabel: v7 ? `AI search<br>readiness / 100<span style="display:block;color:rgba(255,255,255,.6);font-size:9px;margin-top:6px;text-transform:none;letter-spacing:.02em">like for like on checks<br>assessed both times</span>` : 'AI visibility<br>score / 100',
  headline: S.coverHeadline, lede: S.coverLede, dims: v7 ? [] : dims,
  chips: v7 ? dims.map((d) => ({ k: d.k, name: d.name, v: `${d.prevMet != null ? `<span>${d.prevMet} →</span> ` : ''}${d.met}`, s: `checks met of ${d.of}${d.prevOf != null && d.prevOf !== d.of ? ` (${d.prevOf} assessed then)` : ''}` })) : null,
  footLeft: `Prepared ${M.date} · ${M.preparedBy || 'The NoW of Work'}`,
}));
parts.push(definitionsPage(num()));

// ---------- scorecard ----------
const hist = D.history || [];
parts.push(section(`${head(num(), 'Scorecard', S.scorecardHeadline, S.scorecardLede)}
  ${hist.length >= 3 ? `<h3>${v7 ? 'AI Search Readiness Index' : 'AI Visibility Score'}, month by month</h3><div class="sub">Out of 100, with the score bands.</div>${trend(hist.map((h) => ({ label: h.label, score: h.total })))}` : ''}
  <h3>Where each pillar moved</h3><div class="sub">Pillar score out of 100, ${esc(M.baselineDate)} (grey) to ${esc(M.date)} (teal).</div>
  ${pillarChart(rows)}
  <div class="src">Same scoring model both times (${esc(M.modelVersion || '6.0')}). ${esc(M.scopeNote || '')}${B.range && N.range ? ` Unverified range ${B.range[0]}–${B.range[1]} then, ${N.range[0]}–${N.range[1]} now.` : ''}</div>
  ${flipLine ? callout(`**What actually moved.** ${flipLine}`, 'teal') : ''}
  <div class="grid2" style="margin-top:22px"><div><h3>Where the ${Math.abs(N.total - B.total)} points came from</h3><div class="sub">Each pillar’s change × its weight in the overall score.</div>
  ${waterfall({ start: B.total, end: N.total, steps: steps_ })}
  ${Math.abs(B.total + sumDelta - N.total) >= 0.5 ? `<div class="src">Weighted changes sum to ${(Math.round(sumDelta * 10) / 10)}; the totals are whole numbers after rounding.</div>` : ''}</div>
  <div><h3>SEO, AEO and GEO</h3>${v7 ? `<div class="sub">Checks met now.</div>${disciplineBars(dims.map((d) => d.detail ? { k: d.k, ...d.detail } : { k: d.k, met: d.met, partial: 0, notmet: d.of - d.met, unverifiable: 0, total: d.of }), { width: 270 })}` : `<div class="sub">Out of 10.</div>${lenses(dims)}`}</div></div>`));

// ---------- fixed ----------
if (D.fixed?.length) parts.push(section(`${head(num(), 'What we fixed', S.fixedHeadline || `${D.fixed.length} findings *closed*.`, S.fixedLede)}
  ${D.stats?.length ? statStrip(D.stats) : ''}<div class="rule" style="margin:18px 0 4px"></div>
  ${checks(D.fixed.map((f) => ({ title: f.area, text: f.evidence })))}`));

// ---------- status + started ----------
const cnt = { fixed: D.fixed?.length || 0, started: D.started?.length || 0, unchanged: D.unchanged?.length || 0, newIssues: D.newIssues?.length || 0 };
const open = cnt.unchanged + cnt.newIssues;
parts.push(section(`${head(num(), 'Where every finding stands', S.statusHeadline || `${cnt.fixed} fixed, ${cnt.started} halfway, *${open} still open.*`,
    S.statusLede || 'Each square is one finding from the two audits.')}
  <div style="margin-top:18px">${waffle([{ n: cnt.fixed, label: `Fixed since ${M.baselineDate}`, colour: C.teal }, { n: cnt.started, label: 'Started, not finished', colour: C.orange },
    { n: cnt.unchanged, label: `Unchanged since ${M.baselineDate}`, colour: C.grey }, { n: cnt.newIssues, label: `New on ${M.date}`, colour: C.red }].filter((g) => g.n))}</div>
  ${D.started?.length ? `<div class="rule"></div><h3>Started, not finished</h3>${S.startedLede ? `<div class="sub">${md(S.startedLede)}</div>` : ''}${progRows(D.started)}` : ''}`));

// ---------- still open + citation ----------
// v7 visibility: per-engine tests on cluster-robust SEs, Holm-corrected across engines, net of the
// competitor control set's median change on the same engine. Formal verdicts only at a formal test point
// (quarterly, against the original audit); monthly checks are descriptive.
let visBlock = '';
const median = (a) => (!a.length ? null : a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2);
if (VB && VN && VN.tier === 'measured') {
  const ctrlB = VB.controls || [], ctrlN = VN.controls || [];
  const driftFor = (eng) => {
    const ch = ctrlN.map((c) => {
      const b = ctrlB.find((x) => x.name === c.name)?.engines.find((x) => x.engine === eng), n = c.engines.find((x) => x.engine === eng);
      return b && n ? { d: (100 * n.mentions) / n.answers - (100 * b.mentions) / b.answers, v: b.se ** 2 + n.se ** 2 } : null;
    }).filter(Boolean).sort((a, b) => a.d - b.d);
    if (!ch.length) return { d: 0, v: 0, k: 0 };
    return { d: median(ch.map((c) => c.d)), v: ((Math.PI / 2) * (ch.reduce((a, c) => a + c.v, 0) / ch.length)) / ch.length, k: ch.length };
  };
  const missing = [...VB.engines.filter((b) => !VN.engines.find((e) => e.engine === b.engine)).map((b) => `${b.engine} was run only in ${M.baselineDate}`),
    ...VN.engines.filter((e) => !VB.engines.find((b) => b.engine === e.engine)).map((e) => `${e.engine} was run only in ${M.date}`)];
  const rows = VN.engines.map((e) => {
    const b = VB.engines.find((x) => x.engine === e.engine);
    if (!b) return null;
    const dr = driftFor(e.engine);
    const diff = (100 * e.mentions) / e.answers - (100 * b.mentions) / b.answers - dr.d, se = Math.sqrt(e.se ** 2 + b.se ** 2 + dr.v);
    // t reference with the smaller cluster count of the two waves (prompts or days) minus one.
    // Clusters = the smaller of prompts and days in each wave (same rule as the audit's intervals).
    const df = Math.max(Math.min(b.clusters ?? b.prompts ?? 20, e.clusters ?? e.prompts ?? 20) - 1, 1);
    const z = se ? diff / se : 0, pval = 2 * (1 - tCdf(Math.abs(z), df));
    return { engine: e.engine, b, e, diff, pval, drift: dr };
  }).filter(Boolean).sort((x, y) => x.pval - y.pval);
  let stop = false;
  rows.forEach((r, i) => { r.real = !stop && r.pval <= 0.05 / (rows.length - i); if (!r.real) stop = true; });
  const formal = !!M.formalTest;
  const k = rows[0]?.drift.k || 0;
  const fmt = (x) => `${x > 0 ? '+' : ''}${Math.round(x)} point${Math.abs(Math.round(x)) === 1 ? '' : 's'}`;
  visBlock = `<h3>Mention rate by engine, then and now</h3><div class="sub">${formal ? 'Formal test against the original audit: each engine tested separately (cluster-robust errors, Holm-corrected)' : 'Monthly check: changes shown for information only. Formal verdicts come at the quarterly re-audit, against the original audit'}${k ? `; net of the median change for ${k} competitor${k === 1 ? '' : 's'} on the same engine${k < 3 ? ' (indicative: fewer than 3 competitors)' : ''}` : ''}.</div>
  ${table([{ h: 'Engine', k: 'engine', w: '17%' }, { h: 'Before', k: 'bv' }, { h: 'Now', k: 'nv' }, { h: 'Competitor drift', k: 'dr' }, { h: 'Net change', k: 'd' }, { h: 'Detectable', k: 'mdc' }, { h: 'Verdict', k: 'v', w: '15%', pill: (x) => (x === 'Real change' ? 'good' : 'grey') }],
    rows.map((r) => ({ engine: r.engine, bv: `${r.b.rate}% (${r.b.lo}–${r.b.hi})`, nv: `${r.e.rate}% (${r.e.lo}–${r.e.hi})`, dr: r.drift.k ? fmt(r.drift.d) : 'n/a', d: fmt(r.diff), mdc: r.b.mdc != null ? `${r.b.mdc} points` : 'n/a', v: !formal ? 'Descriptive' : r.real ? 'Real change' : 'Within noise' })))}
  ${missing.length ? `<p class="src">${missing.join('; ')}; not compared.</p>` : ''}`;
} else if (VB && VN && VN.tier === 'proxy') {
  const sum = (v) => v.engines.reduce((a, e) => ({ m: a.m + e.mentions, n: a.n + e.answers }), { m: 0, n: 0 });
  const b = sum(VB), c = sum(VN);
  visBlock = callout(`**Search-proxy spot-check.** Named in ${b.m} of ${b.n} checks then, ${c.m} of ${c.n} now. An illustration, not a rate, so no change is called real.`, 'teal');
}
function tCdf(t, df) { // Student t CDF by Simpson integration of the density from 0 to |t|
  const c = Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2)) / Math.sqrt(df * Math.PI);
  const f = (x) => c * Math.pow(1 + (x * x) / df, -(df + 1) / 2);
  const a = Math.abs(t), n = 2000, h = a / n;
  let sum = f(0) + f(a);
  for (let k = 1; k < n; k++) sum += f(k * h) * (k % 2 ? 4 : 2);
  const half = (sum * h) / 3;
  return t >= 0 ? 0.5 + half : 0.5 - half;
}
function lgamma(z) { const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let x = z, y = z, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp); let ser = 1.000000000190015; for (const c of g) ser += c / ++y; return -tmp + Math.log((2.5066282746310005 * ser) / x); }
function normCdf(x) { const t = 1 / (1 + 0.2316419 * x), d = 0.3989423 * Math.exp((-x * x) / 2); return 1 - d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); }
const cit = D.citation;
let citeBlock = '';
if (cit?.current) {
  const c = cit.current, b = cit.baseline;
  const wc = wilson(c.hits, c.total), wb = b ? wilson(b.hits, b.total) : null;
  const bothMeasured = (c.tier || 'measured') === 'measured' && (b?.tier || 'measured') === 'measured';
  const real = !bothMeasured ? '' : wb && !(wc.hi < wb.lo || wb.hi < wc.lo) ? ' The 95% ranges overlap, so this is within measurement noise.' : wb ? ' The 95% ranges don’t overlap, so this is a real change.' : '';
  const change = b ? ` (was ${b.hits} of ${b.total})` : '';
  const big = c.tier === 'measured' ? `${wc.rate}%<span> of ${c.total}</span>` : `${c.hits}<span> of ${c.total}</span>`;
  citeBlock = `<div class="cite"><div><div class="eyebrow"><b></b>${b ? 'AI visibility check' : 'First AI visibility check'}</div>
    <div class="big">${big}</div>${c.tier === 'measured' ? '' : `<div style="margin-top:10px">${dots(c.hits, c.total)}</div>`}</div>
    <p><b>Named in ${c.hits} of ${c.total} ${c.tier === 'measured' ? 'answers' : 'checks'}${change}.</b>${c.tier === 'measured' ? ` That is ${wc.rate}% (95% CI ${wc.lo}–${wc.hi}%).` : ' A search-proxy spot-check: an illustration, not a rate.'}${real} ${md(c.note || '')}</p></div>
    ${cit.controls?.length ? `<h3>Competitor control set</h3><div class="sub">If competitors moved the same way, the change is platform drift, not our work.</div>${ciChart(cit.controls.map((x) => ({ engine: x.name, mentions: x.hits, answers: x.total, ...wilson(x.hits, x.total) })))}` : ''}`;
}
parts.push(section(`${head(num(), 'Still open', S.openHeadline || 'What *hasn’t moved*.', S.openLede)}
  <div class="cols2" style="margin-top:18px">
    <div><div class="colhead"><span class="n">${cnt.unchanged}</span><h3>Unchanged since ${esc(M.baselineDate)}</h3></div>${dotList(D.unchanged || [], C.grey)}</div>
    <div><div class="colhead"><span class="n">${cnt.newIssues}</span><h3>New on ${esc(M.date)}</h3></div>${dotList(D.newIssues || [], C.red)}</div>
  </div>${citeBlock}${visBlock}`));

// ---------- plan tracker ----------
if (D.planTracker?.length) {
  const st = { done: ['Done', 'good'], doing: ['In progress', 'needs'], todo: ['Not started', 'grey'], late: ['Overdue', 'missing'] };
  const c = D.planTracker.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  parts.push(section(`${head(num(), 'Plan tracker', S.planHeadline || `${c.done || 0} of ${D.planTracker.length} plan items *done*.`, S.planLede || 'Every action from the last 30/60/90 plan, and where it stands.')}
  <div style="margin-top:14px">${waffle(Object.entries(st).filter(([k]) => c[k]).map(([k, [l]]) => ({ n: c[k], label: l, colour: { done: C.teal, doing: C.orange, todo: C.grey, late: C.red }[k] })))}</div>
  ${table([{ h: 'Action', k: 'action', w: '38%' }, { h: 'Lane', k: 'lane', w: '12%' }, { h: 'Window', k: 'window', w: '12%' }, { h: 'Status', k: 's', w: '13%', pill: (v) => Object.values(st).find(([l]) => l === v)[1] }, { h: 'Note', k: 'note' }],
    D.planTracker.map((r) => ({ ...r, s: st[r.status][0] })))}`));
}

// ---------- next steps ----------
if (D.nextSteps?.length) parts.push(section(`${head(num(), 'Next steps', S.nextHeadline || `${D.nextSteps.length} moves, *in priority order.*`, S.nextLede)}
  ${S.nextCallout ? callout(S.nextCallout) : ''}<div style="margin-top:6px">${steps(D.nextSteps)}</div>
  <div class="src" style="margin-top:10px">Effort bars on a log scale; a working day counted as 8 hours.</div>`));

// ---------- optional carried-forward pages ----------
if (D.proof) parts.push(section(`${head(num(), 'Where the proof is', D.proof.headline, D.proof.intro)}
  <h3>Named clients by industry</h3>${itemBars(D.proof.clusters.map((x) => ({ label: x.vertical, items: x.clients, note: x.page, first: x.first })))}
  ${D.proof.guardrail ? callout(D.proof.guardrail, 'orange') : ''}`));
if (D.offsite) parts.push(section(`${head(num(), 'Off-site roadmap', D.offsite.headline, D.offsite.overview)}
  <h3>The plays over six months</h3><div class="sub">Bar = when the play runs. Colour = effort.</div>${gantt(D.offsite.plays)}
  ${D.offsite.prNote ? callout(D.offsite.prNote, 'red') : ''}`));
if (D.plan) parts.push(section(`${head(num(), 'Next 90 days', D.plan.headline, D.plan.lede)}${swimlane(D.plan.lanes)}
  ${D.plan.ongoing ? `<h3>After day 90: a quarterly rhythm</h3>${rhythm(D.plan.ongoing)}` : ''}`));

// ---------- method ----------
const mc = D.method || {};
parts.push(section(`${head(num(), 'How this was compared', S.methodHeadline || 'Same scoring model, *two points in time*.', mc.lede)}
  ${mc.cards ? `<div class="cmp">${mc.cards.map((c, i) => `<div class="cmpc${i ? ' now' : ''}"><div class="d">${esc(c.date)}</div><h4>${esc(c.title)}</h4><dl>${c.rows.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl></div>`).join('')}</div>` : ''}
  ${mc.scope ? `<h3>Pages in scope</h3>${scopeBars(mc.scope)}` : ''}
  ${mc.caveats?.length ? `<div class="rule"></div><h3>Read the numbers with these in mind</h3>${caveats(mc.caveats)}` : ''}
  <div class="callout navy" style="margin-top:22px"><b>Next check-in.</b> ${md(mc.next || 'Run the progress check again in about 30 days.')}</div>`));

const slug = `now-visibility-progress-${M.domain.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${M.isoDate}`;
const htmlPath = path.join(OUT, `${slug}.html`);
fs.writeFileSync(htmlPath, page({ title: `${M.domain} search visibility progress`, footer: `${M.domain} · Search visibility progress · ${M.baselineDate} to ${M.date}`, body: parts.join('\n') }));
console.log(htmlPath);
try { console.log(execFileSync('node', [path.join(HERE, 'to-pdf.mjs'), htmlPath], { encoding: 'utf8' }).trim()); }
catch { console.error('PDF step skipped: no headless browser. The HTML prints to PDF from any browser.'); }

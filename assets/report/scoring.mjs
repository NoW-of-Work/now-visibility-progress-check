// Scoring model v7.0. Mirrors references/readiness-checklist.md exactly: change both together.
// The renderer computes every number from the checks and the prompt panel, so a report can't print
// a total that doesn't match its inputs.

export const MODEL_VERSION = '7.0';

export const PILLARS = [
  { key: 'os', name: 'Off-site presence and entity', short: 'Off-site', weight: 45 },
  { key: 'td', name: 'Technical discoverability', short: 'Technical', weight: 25 },
  { key: 'bq', name: 'Buyer-question alignment', short: 'Buyer questions', weight: 20 },
  { key: 'sd', name: 'Structured data', short: 'Schema', weight: 5 },
  { key: 'px', name: 'Page experience', short: 'Speed', weight: 5 },
];
// Alternative weightings for the sensitivity check (plus leave-one-pillar-out, computed below).
export const ALT_WEIGHTS = {
  'equal weights': { os: 20, bq: 20, td: 20, sd: 20, px: 20 },
  'on-site heavy': { os: 30, bq: 30, td: 25, sd: 10, px: 5 },
  'v6 weights': { os: 25, bq: 25, td: 25, sd: 15, px: 10 },
};
export const MIN_PROMPTS = 20;
export const MIN_RUNS = 8; // per prompt per engine (Schulte et al. via Martinez 2026: 7–8 repetitions)
export const MIN_ENGINES = 3;
export const MAX_SITE_SOURCED = 1 / 3;
export const MIN_DAYS = 8; // runs per prompt and engine spread over at least 8 separate days (day effects need enough day groups)

export const GATES = {
  G1: 'Search crawlers can reach key pages',
  G2: 'AI search bots are not blocked',
  G3: 'Content is in the raw HTML',
  G4: 'Key pages are indexed',
  G5: 'Not opted out of Google’s AI features',
  G6: 'No Google spam-policy pattern',
};

// id: [pillar, label, disciplines]
export const CHECKS = {
  OS1: ['os', 'Entity facts are consistent', ['geo']],
  OS2: ['os', 'Official profiles are linked', ['geo']],
  OS3: ['os', 'Knowledge graph presence', ['geo']],
  OS4: ['os', 'Category review platforms', ['geo']],
  OS5: ['os', 'Third-party mention volume', ['geo']],
  OS6: ['os', 'Named in third-party videos', ['geo']],
  OS7: ['os', 'Present where the category’s answers draw from', ['geo']],
  OS8: ['os', 'Clean brand search', ['seo', 'geo']],
  OS9: ['os', 'Local listings', ['seo', 'geo']],
  BQ1: ['bq', 'Buyer questions have pages', ['geo', 'aeo']],
  BQ2: ['bq', 'Direct answer near the top', ['aeo']],
  BQ3: ['bq', 'Question-led structure', ['aeo']],
  BQ4: ['bq', 'Original data or first-hand proof', ['geo']],
  BQ5: ['bq', 'Sourced claims', ['geo']],
  BQ6: ['bq', 'Named, credible authors', ['seo', 'geo']],
  BQ7: ['bq', 'Honest dates', ['seo', 'geo']],
  BQ8: ['bq', 'Decision content', ['geo']],
  BQ9: ['bq', 'Specific language', ['aeo', 'geo']],
  BQ10: ['bq', 'Proof is findable', ['seo', 'geo']],
  TD1: ['td', 'Clean responses', ['seo']],
  TD2: ['td', 'One canonical site', ['seo']],
  TD3: ['td', 'Complete sitemap', ['seo']],
  TD4: ['td', 'Internal linking', ['seo']],
  TD5: ['td', 'Fresh index', ['geo']],
  TD6: ['td', 'Titles and descriptions', ['seo']],
  TD7: ['td', 'Clear outline', ['seo', 'aeo']],
  TD8: ['td', 'Bing submission', ['seo']],
  TD9: ['td', 'Language versions', ['seo']],
  TD10: ['td', 'Deliberate training-bot policy', ['geo']],
  SD1: ['sd', 'Organization markup is valid', ['seo']],
  SD2: ['sd', 'Page-type markup', ['seo']],
  SD3: ['sd', 'Valid and honest markup', ['seo']],
  SD4: ['sd', 'No retired tactics', ['seo', 'aeo']],
  SD5: ['sd', 'Site name and breadcrumbs', ['seo']],
  PX1: ['px', 'Loading (LCP ≤ 2.5 s)', ['seo']],
  PX2: ['px', 'Responsiveness (INP ≤ 200 ms)', ['seo']],
  PX3: ['px', 'Stability (CLS ≤ 0.1)', ['seo']],
  CM1: ['cm', 'Product feed health', []],
  CM2: ['cm', 'Price and stock parity', []],
  CM3: ['cm', 'Shipping and returns', []],
  CM4: ['cm', 'Agent checkout routes', []],
};

const RESULTS = { met: 1, partial: 0.5, notmet: 0, unverifiable: null, na: null };
export const RESULT_LABEL = { met: 'Met', partial: 'Partial', notmet: 'Not met', unverifiable: 'Unverifiable', na: 'n/a' };
export const RESULT_PILL = { met: 'good', partial: 'needs', notmet: 'missing', unverifiable: 'verify', na: 'grey' };
export const GATE_LABEL = { pass: ['Pass', 'good'], fail: ['Fail', 'missing'], verify: ['Verify', 'verify'], choice: ['Your choice', 'grey'] };

export const BAND_ORDER = ['Critical', 'Needs Work', 'On Track', 'Strong'];
export const band = (s) => (s >= 85 ? 'Strong' : s >= 70 ? 'On Track' : s >= 50 ? 'Needs Work' : 'Critical');
const round = (x) => Math.round(x);

/** Wilson 95% interval for k of n (effective n allowed to be fractional), as percentages. */
export function wilson(k, n, z = 1.96) {
  if (!n) return { rate: null, lo: null, hi: null };
  const p = k / n, z2 = z * z;
  const c = (p + z2 / (2 * n)) / (1 + z2 / n);
  const h = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return { rate: Math.round(p * 100), lo: Math.max(0, Math.round((c - h) * 100)), hi: Math.min(100, Math.round((c + h) * 100)) };
}

/**
 * Mention rate for one engine across a prompt panel, treating each prompt as a cluster of runs.
 * Repeated runs of one prompt are not independent, so the interval uses a cluster-robust variance
 * (ratio estimator) and a Wilson interval on the effective sample size.
 * cells: [{runs, mentions}] one per prompt.
 */
export function clusterRate(cells) {
  // cells: [{runs, mentions, prompt?, date?}]. With prompt and date keys, use two-way cluster-robust
  // variance (prompt + day − prompt×day), floored at the prompt-level variance; otherwise prompt-level.
  const R = cells.reduce((a, c) => a + c.runs, 0), M = cells.reduce((a, c) => a + c.mentions, 0);
  if (!R) return { answers: 0, mentions: 0, rate: null, lo: null, hi: null, se: null, deff: null, effN: 0 };
  const p = M / R;
  const varBy = (key) => {
    const g = new Map();
    for (const c of cells) { const k = key(c); const x = g.get(k) || { r: 0, m: 0 }; x.r += c.runs; x.m += c.mentions; g.set(k, x); }
    const G = [...g.values()], k = G.length;
    return k > 1 ? (k / (k - 1)) * G.reduce((a, x) => a + (x.m - p * x.r) ** 2, 0) / (R * R) : 0;
  };
  const hasKeys = cells.every((c) => c.prompt != null);
  const vP = varBy((c) => (hasKeys ? c.prompt : cells.indexOf(c)));
  let v = vP;
  const nPrompts = new Set(cells.map((c, i) => (hasKeys ? c.prompt : i))).size;
  const twoWay = hasKeys && cells.every((c) => c.date);
  const nDays = twoWay ? new Set(cells.map((c) => c.date)).size : Infinity;
  if (twoWay) v = Math.max(vP, vP + varBy((c) => c.date) - varBy((c) => `${c.prompt}|${c.date}`));
  // Critical value from the smaller number of clusters (prompts or days), t with G − 1 degrees of freedom.
  const G = Math.min(nPrompts, nDays);
  const zc = G > 1 && G < 200 ? qt(0.975, G - 1) : 1.96;
  const vSrs = (p * (1 - p)) / R;
  const pt = (M + 2) / (R + 4); // Agresti–Coull centre: never 0 or 1, so a 0% or 100% rate still has an error
  const vUse = Math.max(v, vSrs, (pt * (1 - pt)) / R);
  const deff = vSrs > 0 ? Math.max(1, v / vSrs) : 1;
  const w = wilson(M / deff, R / deff, zc);
  return { answers: R, mentions: M, rate: Math.round(p * 100), lo: w.lo, hi: w.hi, se: Math.sqrt(vUse) * 100, deff: Math.round(deff * 10) / 10, effN: Math.round(R / deff), clusters: Number.isFinite(nDays) ? Math.min(nPrompts, nDays) : nPrompts, days: Number.isFinite(nDays) ? nDays : null };
}

/** Validate the audit data and compute every score. Throws on any contract breach. */
export function score(A) {
  const errs = [];
  const S = A.score || {};
  const gates = (S.gates || []).map((g) => {
    if (!GATES[g.id]) errs.push(`Unknown gate ${g.id}`);
    if (!GATE_LABEL[g.result]) errs.push(`Gate ${g.id}: result must be pass, fail, verify or choice`);
    if (g.result === 'verify' && !['G1', 'G2', 'G4', 'G5'].includes(g.id)) errs.push(`Gate ${g.id}: only G1 (behind a CDN), G2, G4 and G5 can be verify; the others are visible from outside`);
    if (g.result === 'verify' && !g.tool) errs.push(`Gate ${g.id}: a verify gate must name the tool that would confirm it`);
    if (g.id === 'G5' && g.result === 'fail') errs.push('Gate G5 has no fail state: an opt-out is a documented choice, or verify it');
    if (g.result === 'choice' && !['G2', 'G5'].includes(g.id)) errs.push(`Gate ${g.id}: only G2 and G5 can be a documented choice`);
    if (g.result === 'choice' && !g.cost) errs.push(`Gate ${g.id}: a documented choice must state its visibility cost`);
    return { ...g, label: GATES[g.id] };
  });
  for (const id of Object.keys(GATES)) if (!gates.find((g) => g.id === id)) errs.push(`Gate ${id} is missing`);
  const ROLES = ['home', 'service', 'product', 'pricing', 'about', 'contact', 'top-impressions', 'top-linked'];
  for (const k of A.keyPages || []) if (typeof k !== 'object' || !k.url || !ROLES.includes(k.role)) errs.push(`keyPages: each entry needs {url, role} with role one of ${ROLES.join(', ')}`);
  if (!Array.isArray(A.keyPages) || A.keyPages.length < 3) errs.push('keyPages: list the key pages (home, primary service or product pages, pricing, about, contact, top pages by impressions)');

  const checks = (S.checks || []).map((c) => {
    const def = CHECKS[c.id];
    if (!def) { errs.push(`Unknown check ${c.id}`); return null; }
    if (!(c.result in RESULTS)) errs.push(`Check ${c.id}: result must be met, partial, notmet, unverifiable or na`);
    if (!['A', 'B', 'C'].includes(c.grade) && !['unverifiable', 'na'].includes(c.result)) errs.push(`Check ${c.id}: grade must be A, B or C`);
    if (c.result === 'unverifiable' && !c.tool) errs.push(`Check ${c.id}: an unverifiable check must name the tool that would confirm it`);
    if (c.result === 'na' && !c.evidence) errs.push(`Check ${c.id}: n/a needs a reason in evidence`);
    if (def[0] === 'px' && !['unverifiable', 'na'].includes(c.result) && c.grade !== 'A') errs.push(`Check ${c.id}: page experience is scored only from a measured tool (grade A)`);
    if (c.id === 'TD8' && gates.find((g) => g.id === 'G4')?.result !== 'pass' && c.result !== 'na') errs.push('Check TD8: n/a unless G4 passed');
    if (c.id === 'OS5' && !['unverifiable', 'na'].includes(c.result) && c.grade !== 'A') errs.push('Check OS5: mention volume is scored only from a mention-tracking tool (grade A); otherwise mark it unverifiable');
    return { ...c, pillar: def[0], label: c.label || def[1], disc: def[2] };
  }).filter(Boolean);
  const seen = new Set();
  for (const c of checks) { if (seen.has(c.id)) errs.push(`Check ${c.id} appears more than once`); seen.add(c.id); }
  const gseen = new Set();
  for (const g of gates) { if (gseen.has(g.id)) errs.push(`Gate ${g.id} appears more than once`); gseen.add(g.id); }
  const required = Object.entries(CHECKS).filter(([, d]) => d[0] !== 'cm').map(([id]) => id);
  for (const id of required) if (!checks.find((c) => c.id === id)) errs.push(`Check ${id} is missing (use na with a reason if it doesn't apply)`);

  const pillars = PILLARS.map((p) => {
    const own = checks.filter((c) => c.pillar === p.key);
    const applicable = own.filter((c) => c.result !== 'na');
    const assessed = applicable.filter((c) => RESULTS[c.result] != null);
    const unv = applicable.filter((c) => c.result === 'unverifiable');
    const partials = assessed.filter((c) => c.result === 'partial').length;
    const earned = assessed.reduce((a, c) => a + RESULTS[c.result], 0);
    const n = assessed.length, all = applicable.length;
    return {
      ...p, checks: own, assessed: n, applicable: all, unverifiable: unv.length,
      coverage: all ? n / all : 0,
      measured: n > 0,
      score: n ? (100 * earned) / n : null,
      // Unverified range: unverifiable items at 0 and at 1.
      lo: all ? (100 * earned) / all : 0,
      hi: all ? (100 * (earned + unv.length)) / all : 100,
      // Judgment range: partial calls at 0 and at 1 (on assessed items).
      jlo: n ? (100 * (earned - 0.5 * partials)) / n : null,
      jhi: n ? (100 * (earned + 0.5 * partials)) / n : null,
      gradeCShare: n ? assessed.filter((c) => c.grade === 'C').length / n : 0,
    };
  });
  // Only page experience may drop out when unmeasured. Any other pillar with no assessed checks stays in
  // the range at 0–100 and makes the index provisional; its point is left out of the point estimate.
  const pointPillars = pillars.filter((p) => p.measured);
  const rangePillars = pillars.filter((p) => p.measured || (p.key !== 'px' && p.applicable > 0));
  const W = Object.fromEntries(PILLARS.map((p) => [p.key, p.weight]));
  const wmean = (list, f, w = W) => list.reduce((a, p) => a + f(p) * w[p.key], 0) / list.reduce((a, p) => a + w[p.key], 0);
  const failed = gates.filter((g) => g.result === 'fail');
  const cap = (x) => (failed.length ? Math.min(x, 49) : x);
  const blind = pillars.filter((p) => p.key !== 'px' && p.applicable > 0 && !p.measured && p.weight >= 20);
  const index = {
    point: blind.length ? null : round(cap(wmean(pointPillars, (p) => p.score))),
    lo: round(cap(wmean(rangePillars, (p) => p.lo))), hi: round(cap(wmean(rangePillars, (p) => p.hi))), // capped when a gate failed
    jlo: blind.length ? null : round(cap(wmean(pointPillars, (p) => p.jlo))), jhi: blind.length ? null : round(cap(wmean(pointPillars, (p) => p.jhi))),
  };
  const uncapped = blind.length ? null : round(wmean(pointPillars, (p) => p.score));
  // What the ranges and sensitivity would be once the failed gate is fixed (shown, labelled, when capped).
  const ifFixed = failed.length ? {
    lo: round(wmean(rangePillars, (p) => p.lo)), hi: round(wmean(rangePillars, (p) => p.hi)),
    jlo: blind.length ? null : round(wmean(pointPillars, (p) => p.jlo)), jhi: blind.length ? null : round(wmean(pointPillars, (p) => p.jhi)),
  } : null;
  const sensitivity = [
    ...Object.entries(ALT_WEIGHTS).map(([name, w]) => ({ name, value: round(wmean(pointPillars, (p) => p.score, w)) })),
    ...pointPillars.map((drop) => ({ name: `without ${drop.short.toLowerCase()}`, value: round(wmean(pointPillars.filter((p) => p !== drop), (p) => p.score)) })),
  ];
  const span = failed.length ? ['Critical'] : [...(index.point != null ? [band(index.point)] : []), band(index.lo), band(index.hi), ...sensitivity.map((s) => band(s.value))];
  const sorted = [...new Set(span)].sort((a, b) => BAND_ORDER.indexOf(a) - BAND_ORDER.indexOf(b));
  const bandLabel = sorted.length > 1 ? `${sorted[0]} to ${sorted[sorted.length - 1]}` : sorted[0];
  const applicableAll = checks.filter((c) => !['cm', 'px'].includes(c.pillar) && c.result !== 'na');
  const unvShare = applicableAll.filter((c) => c.result === 'unverifiable').length / (applicableAll.length || 1);
  const assessedAll = checks.filter((c) => c.pillar !== 'cm' && RESULTS[c.result] != null);
  const cShare = assessedAll.filter((c) => c.grade === 'C').length / (assessedAll.length || 1);
  const lowCoverage = pillars.filter((p) => p.key !== 'px' && p.applicable > 0 && p.coverage < 0.5);
  const reasons = [];
  if (cShare > 1 / 3) reasons.push('more than a third of the assessed evidence is inferred');
  if (unvShare > 1 / 3) reasons.push('more than a third of the checks could not be verified');
  if (checks.find((c) => c.id === 'OS5')?.result === 'unverifiable') reasons.push('the main off-site measure (mention volume) wasn’t available');
  if (blind.length) reasons.push(`no ${blind.map((p) => p.short.toLowerCase()).join(' or ')} checks could be assessed, so there is no point estimate, only a range`);
  if (lowCoverage.length) reasons.push(`under half of the ${lowCoverage.map((p) => p.short.toLowerCase()).join(' and ')} checks could be assessed`);
  const confidence = reasons.length ? 'provisional' : 'standard';
  const effective = Object.fromEntries(pointPillars.map((p) => [p.key, Math.round((1000 * W[p.key]) / pointPillars.reduce((a, q) => a + W[q.key], 0)) / 10]));

  const disciplines = ['seo', 'aeo', 'geo'].map((d) => {
    const own = checks.filter((c) => c.disc.includes(d) && c.result !== 'na');
    return { k: d.toUpperCase(), met: own.filter((c) => c.result === 'met').length, partial: own.filter((c) => c.result === 'partial').length,
      notmet: own.filter((c) => c.result === 'notmet').length, unverifiable: own.filter((c) => c.result === 'unverifiable').length, total: own.length };
  });

  // Observed visibility: computed from the frozen prompt panel, never typed in.
  const V = A.visibility;
  let visibility = null;
  if (V) {
    if (!['measured', 'proxy'].includes(V.tier)) errs.push('visibility.tier must be measured or proxy');
    const panel = V.panel || [];
    const unbranded = panel.filter((p) => !p.branded);
    const engineNames = [...new Set(unbranded.flatMap((p) => Object.keys(p.results || {})))];
    const engines = engineNames.map((engine) => {
      const cells = unbranded.map((p) => p.results?.[engine]).filter(Boolean);
      const clusters = unbranded.flatMap((p, pi) => { const c = p.results?.[engine]; if (!c) return []; return c.days?.length ? c.days.map((d) => ({ ...d, prompt: pi })) : [{ ...c, prompt: pi }]; });
      const searched = cells.reduce((a, c) => a + (c.searched ?? 0), 0);
      const est = clusterRate(clusters);
      return { engine, prompts: cells.length, searched, hasSearched: cells.some((c) => c.searched != null), ...est, mdc: detectableChange({ rate: est.rate, deff: est.deff, answers: est.answers, prompts: est.clusters, engines: engineNames.length }) };
    });
    if (V.tier === 'measured') {
      if (unbranded.length < MIN_PROMPTS) errs.push(`visibility: the measured tier needs at least ${MIN_PROMPTS} unbranded prompts (has ${unbranded.length}); use the proxy tier`);
      if (engines.length < MIN_ENGINES) errs.push(`visibility: the measured tier needs at least ${MIN_ENGINES} engines`);
      const short = [];
      for (const p of unbranded) for (const e of engineNames) {
        const c = p.results?.[e];
        if (!c || !Number.isFinite(c.runs) || c.runs < MIN_RUNS) { short.push(c?.runs ?? 0); continue; }
        if (!Number.isFinite(c.searched)) errs.push(`visibility: "${p.prompt}" on ${e} needs searched (runs where the engine searched the web)`);
        const days = c.days || [];
        if (new Set(days.map((d) => d.date)).size < MIN_DAYS) errs.push(`visibility: "${p.prompt}" on ${e} needs runs spread over at least ${MIN_DAYS} days (days[])`);
        else if (days.some((d) => !(d.runs > 0) || d.mentions > d.runs)) errs.push(`visibility: "${p.prompt}" on ${e}: every day needs at least one run and no more mentions than runs`);
        else if (days.reduce((a, d) => a + d.runs, 0) !== c.runs || days.reduce((a, d) => a + d.mentions, 0) !== c.mentions) errs.push(`visibility: "${p.prompt}" on ${e}: day totals don't match runs and mentions`);
      }
      if (short.length) errs.push(`visibility: ${short.length} prompt-engine cells have fewer than ${MIN_RUNS} runs (lowest ${Math.min(...short)}); the measured tier needs ${MIN_RUNS} on every engine`);
      const siteShare = unbranded.filter((p) => p.source === 'site').length / (unbranded.length || 1);
      if (siteShare > MAX_SITE_SOURCED) errs.push('visibility: no more than a third of prompts may come from the client’s own site');
      const SOURCES = ['sales', 'gsc', 'keyword', 'competitor', 'community', 'site'];
      if (unbranded.some((p) => !SOURCES.includes(p.source))) errs.push('visibility: every prompt needs a source (sales, gsc, keyword, competitor, community or site)');
    }
    for (const p of panel) for (const [e, c] of Object.entries(p.results || {})) {
      if (!Number.isFinite(c.runs) || !Number.isFinite(c.mentions)) errs.push(`visibility: "${p.prompt}" on ${e} needs numeric runs and mentions`);
      if (c.mentions > c.runs) errs.push(`visibility: "${p.prompt}" has more mentions than runs on ${e}`);
      for (const [name, k] of Object.entries(c.competitors || {})) if (!(k >= 0 && k <= c.runs)) errs.push(`visibility: "${p.prompt}" on ${e}: ${name} has an impossible mention count`);
      if (c.searched != null && c.searched > c.runs) errs.push(`visibility: "${p.prompt}" has more searched runs than runs on ${e}`);
    }
    // Competitor control set, measured on the same panel: results[engine].competitors = {name: mentions}.
    const names = [...new Set(unbranded.flatMap((p) => Object.values(p.results || {}).flatMap((c) => Object.keys(c.competitors || {}))))];
    const controls = names.map((name) => ({ name, engines: engineNames.map((engine) => {
      const cl = unbranded.flatMap((p, pi) => { const c = p.results?.[engine]; if (!c) return []; return [{ runs: c.runs, mentions: c.competitors?.[name] ?? 0, prompt: pi }]; });
      return { engine, ...clusterRate(cl) };
    }) }));
    visibility = { ...V, engines, controls, rateSpan: engines.length ? [Math.min(...engines.map((e) => e.rate)), Math.max(...engines.map((e) => e.rate))] : null };
  }
  if (A.meta?.modelVersion && A.meta.modelVersion !== MODEL_VERSION) errs.push(`meta.modelVersion is ${A.meta.modelVersion}; this renderer scores model ${MODEL_VERSION}`);
  for (const f of ['domain', 'date', 'isoDate', 'depth']) if (!A.meta?.[f]) errs.push(`meta.${f} is required`);
  if (A.meta && !['full', 'quick'].includes(A.meta.depth)) errs.push('meta.depth must be full or quick');
  if (!A.summary?.headline || !A.summary?.strength) errs.push('summary: needs headline and strength');
  if (!A.summary || !Array.isArray(A.summary.paragraphs) || !Array.isArray(A.summary.topFixes)) errs.push('summary: needs headline, paragraphs[] and topFixes[]');
  if (!Array.isArray(A.fixes)) errs.push('fixes: needs an array of fixes');
  else for (const f of A.fixes) {
    if (!['critical', 'quick', 'high', 'future'].includes(f.priority)) errs.push(`fixes: "${f.fix}" has an unknown priority (critical, quick, high, future)`);
    if (typeof f.fix !== 'string' || typeof f.impact !== 'string') errs.push('fixes: every fix needs fix and impact text');
    if (f.priority === 'critical' && !failed.length) errs.push(`fixes: "${f.fix}" is marked critical, but critical is only for fixing a failed access check`);
  }
  if (failed.length && A.fixes?.[0]?.priority !== 'critical') errs.push('fixes: a failed access check must be the first fix, marked critical');
  const K = A.content;
  if (K?.evidence && !(Array.isArray(K.evidence.clusters) && K.evidence.clusters.every((c) => c.vertical && Array.isArray(c.clients) && c.page))) errs.push('content.evidence: needs clusters[] with vertical, clients[] and page');
  for (const sp of K?.specs || []) for (const f of ['title', 'h1', 'question', 'answer', 'structure', 'evidence', 'schema', 'slug']) if (!sp[f]) errs.push(`content.specs: "${sp.title || '?'}" needs ${f}`);
  if (K?.guardrails && !['production', 'architecture', 'measurement'].every((k) => Array.isArray(K.guardrails[k]))) errs.push('content.guardrails: needs production[], architecture[] and measurement[]');
  if (A.meta?.ecommerce && !['CM1', 'CM2', 'CM3', 'CM4'].every((id) => (A.score?.checks || []).some((c) => c.id === id))) errs.push('meta.ecommerce is true, so commerce checks CM1–CM4 are required');
  if (A.offsite && !Array.isArray(A.offsite.plays)) errs.push('offsite.plays must be an array');
  for (const p of A.offsite?.plays || []) if (!['low', 'medium', 'high'].includes(p.effort)) errs.push(`offsite: play "${p.name}" needs effort low, medium or high`);
  if (errs.length) throw new Error(`Audit data breaks the scoring contract:\n- ${[...new Set(errs)].slice(0, 30).join('\n- ')}`);
  return { modelVersion: MODEL_VERSION, uncapped, ifFixed, gates, failed, checks, pillars, index, band: index.point != null ? band(index.point) : bandLabel, bandLabel, sensitivity, confidence, reasons, effective, disciplines, visibility, commerce: checks.filter((c) => c.pillar === 'cm') };
}

// Inverse normal CDF (Acklam) and a Cornish-Fisher t quantile, enough for planning numbers.
function qnorm(p) {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const q = p < 0.5 ? Math.sqrt(-2 * Math.log(p)) : Math.sqrt(-2 * Math.log(1 - p));
  if (p > 0.02425 && p < 0.97575) {
    const r = (p - 0.5) * (p - 0.5), x = p - 0.5;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * x / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const v = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  return p < 0.5 ? v : -v;
}
function qt(p, df) {
  const z = qnorm(p);
  return z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df * df);
}
/**
 * Smallest change in an engine's mention rate the re-check can detect (80% power), in points, from a
 * planning rate rather than the observed SE: p = max(rate, 5%), deff = max(observed, 1.5),
 * alpha split across engines (Holm's first step), t with prompts − 1 degrees of freedom.
 */
// `prompts` here is the number of independent clusters: prompts, or days if fewer (shared day effects
// don't shrink as prompts are added).
export function detectableChange({ rate, deff, answers, prompts, engines }) {
  if (!answers || !prompts) return null;
  const p = Math.max((rate ?? 0) / 100, 0.05), D = Math.max(deff ?? 1, 1.5), m = Math.max(engines || 1, 1);
  const se = Math.sqrt((p * (1 - p) * D) / answers);
  return Math.round((qt(1 - 0.05 / (2 * m), Math.max(prompts - 1, 1)) + 0.8416) * Math.SQRT2 * se * 100);
}

/** Recompute the index from a {checkId: result} map, optionally over a subset of check IDs (like-for-like). */
export function indexFromResults(results, ids = null) {
  const use = ids ? new Set(ids) : null;
  const per = PILLARS.map((p) => {
    const own = Object.entries(results).filter(([id, r]) => CHECKS[id]?.[0] === p.key && (!use || use.has(id)) && RESULTS[r] != null);
    return { key: p.key, w: p.weight, n: own.length, score: own.length ? (100 * own.reduce((a, [, r]) => a + RESULTS[r], 0)) / own.length : null };
  }).filter((p) => p.n);
  return per.length ? Math.round(per.reduce((a, p) => a + p.score * p.w, 0) / per.reduce((a, p) => a + p.w, 0)) : null;
}
export const RESULT_POINTS = RESULTS;

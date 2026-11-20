# Progress method and data file

## Classifying findings

Do this after the blind re-score (SKILL.md Step 2), once the baseline is open. Work from the original audit's
findings list: every check that was partial, not met or unverifiable, every gate
that failed or needed verifying, every priority fix, and every open item from the last progress report. Each gets
exactly one bucket.

| Bucket | Use it when | Evidence to record |
|---|---|---|
| **Fixed** | You saw the fix live this month. | What's there now, with a number or URL ("Pricing page live at /pricing, three tiers"). |
| **Started** | Part of it is done; the part that matters for visibility isn't. | `done` and `left`, plus a rough `progress` % (how much of the work, not how much of the score). |
| **Unchanged** | It looks the same as last time. | One line on what's still there. |
| **New** | It wasn't in the baseline. | What it is and why it matters. If it only appeared because the scan went deeper, say so. |

A finding that got worse goes in **New** with "worse since [date]" in the detail.

Fixed items with a clear before and after number (sourced statistics 1 → 48, sitemap URLs 21 → 68) also go in
`stats`, up to four, as the stat strip on the fixed page. Pick the ones a business owner would care about.

## Plan tracker

Every row of the baseline's 30/60/90 plan, with `window` ("Days 1–30") and `status`:
`done` (seen live), `doing` (partly), `todo` (not started, still inside its window), `late` (not done and its
window has passed). Leave the tracker out for a Quick Audit baseline with no plan.

## Re-audit rules (when a change counts as real)

These rules decide every "real change" sentence in the report. When a change doesn't pass, the report says so
plainly ("within measurement noise", "within the audit's uncertainty", "measurement change", "platform drift").

**Same scoring model, or no comparison.** Both audits must carry the same scoring model version in their score
data (`scores.baseline.modelVersion` and `scores.current.modelVersion`, copied from each `.scores.json`). The
renderer refuses a mismatch or a missing version, and it decides the version from the score data, never from
`meta`. A v6 baseline must be rescored on v7 first. "Same model" means the scoring model; changes to the AI
engines' own models can't be frozen and are recorded as platform events in the method caveats.

**Never type a score block.** `scores.baseline`, `scores.current` and both `visibility` blocks are copied
byte for byte from each audit's `.scores.json`. If they aren't, the comparison is invalid. The renderer refuses a
v7 block that lacks `pillars`, `disciplines`, `checks` or `gates`. A range-only block (an audit with no point
estimate, `total: null`, some pillars absent) is accepted: the like-for-like index is built from the checks, and
the scope note prints the raw side as a range.

**Score blind.** Fill in every check and gate result for this month before opening the baseline `.scores.json`
(or the score block of the baseline data file, or the last progress file), and record `meta.blindRescore: true`;
record `false` if you saw the baseline results first. The re-score needs only the site, the key pages and the
frozen prompt panel, so a fresh sub-agent given just those keeps it blind. The baseline findings may be read once
the re-score is saved. The renderer then lists every check that flipped; for each flip between partial and met or
not met, record the evidence for the new call in the method caveats. One partial → met call moves a ten-check
pillar 5 points, so a judgment drift can look like progress.

**AI Search Readiness Index.**
- **Like for like.** The renderer recomputes each pillar, and the index, over the checks assessed (met, partial or
  not met) in **both** audits, and the cover and the waterfall use that like-for-like index. The raw move (the two
  audits' own totals) is printed beside it as "including measurement change". A pillar with no checks assessed in
  both audits drops out of both totals; the renderer names it in the scope note.
- List **the checks whose result changed** among those assessed both times: improved, worsened. The renderer
  prints them in "What actually moved".
- A check that was unverifiable last time and is assessed now (a new login, a new tool) is a measurement change,
  not progress. The renderer lists it as "became verifiable". If the raw index moved only because of newly
  verifiable checks, label the move **"measurement change"**.
- **Gate cap.** The renderer decides whether a side is capped from its gates (any `fail`), not from `total`
  against `uncapped`, so a range-only block with `total: null` is never mistaken for a capped one. If a failed
  gate capped either audit at 49, the like-for-like totals are capped the same way and the waterfall adds a
  "Gate cap" step, so the steps add up to the headline move and the gate fix gets the credit.
- Don't use "the ranges don't overlap" as a test. The unverified range shrinks whenever access improves, so two
  audits of an unchanged site can show non-overlapping ranges.

**Observed AI visibility (measured tier).**
- **Fixed baseline.** The visibility baseline is always the **original audit**, not last month. Each monthly
  check compares with it.
- **Monthly is descriptive; quarterly is the test.** Holm controls error across engines within one test, not
  across twelve months of tests. So monthly checks (`meta.formalTest: false`, the default) show each engine's move
  labelled "Descriptive", with no verdict. Only the quarterly re-audit sets `meta.formalTest: true`, and only then
  does the renderer print "Real change" or "Within noise". Quarterly testing still repeats: each verdict has a 5%
  false-alarm rate, so over a year of quarterly tests there is about a 1-in-6 chance of one false "real change"
  when nothing changed. Say so in the method caveats, and treat a single real-change verdict as provisional until
  the next quarter agrees.
- **Per engine, never pooled.** For each engine, the change is the client's rate change (from mentions ÷ answers,
  not the rounded rates) minus the competitor drift on the same engine. It is tested with a two-proportion t-test (degrees of freedom: the smaller cluster count of the two waves, prompts
  or days, minus one) whose standard error combines the two audits' cluster-robust errors (`se`) and the drift's variance, with a
  **Holm step-down across the engines** (smallest p first, at 0.05 ÷ engines left). A change is "real" only if it
  survives. The test treats the two waves as independent samples, although both use the same frozen prompts. When
  prompt effects persist from one wave to the next, that overstates the error, so the test is conservative: it
  can miss a small real change, but it doesn't make one up.
- **Competitor drift.** Each audit's `.scores.json` carries the control set per engine (`visibility.controls`).
  For each engine, the drift is the true median of the competitors' rate changes (the average of the middle pair
  when there is an even number), and its variance is (π ÷ 2) × the mean of the competitors' squared change errors
  ÷ the number of competitors. With fewer than 3 competitors, the table says the control is "indicative". If the
  client's change disappears after the drift is taken off, call it platform drift. The adjustment is additive in
  points, so when the client and the competitors have very different base rates (say 14% against 70%) it is
  approximate. Competitor counts must be recorded in every panel cell, with `0` written explicitly when no run
  named that competitor: a missing name is counted as 0 without warning, and a competitor renamed between audits
  silently drops out of the control set.
- **Detectable change.** The table prints the baseline's smallest detectable change per engine ("N points"). A
  move smaller than that is one the panel couldn't have seen. It is planned with G − 1 degrees of freedom, where G
  is the smaller of the number of prompts and the number of days, because a shared day effect doesn't shrink as
  prompts are added. At 20 prompts over 8 days the re-check only detects large moves (at least about 16 points;
  each report prints its own figure). Precision comes from more prompts run on more separate days, not from more
  runs of the same prompt on the same days. For month-to-month tracking use 40 or more prompts, or treat monthly
  results as descriptive and test quarterly.
- **Engines in one audit only** are listed under the table ("Perplexity was run only in 18 Dec; not compared").
- Same frozen panel, same engines, same competitors, at least the same runs per prompt per engine, spread over at
  least 8 separate dates (distinct dates are counted; in practice one run a day for 8 days). If prompts changed, report the old and new sets separately; never compare rates across different
  panels.

**Never compare a proxy result with a measured one.** The renderer refuses a pair whose tiers differ. A proxy
pair gets one line, "Named in X of N checks then, Y of M now. An illustration, not a rate, so no change is called
real", with no interval and no verdict.

**Outcome counts** (GA4 AI sessions, Bing citations, Search Console AI impressions): a change is real only if it
exceeds 2 × √(2 × baseline count) and holds for two consecutive months. For 38 sessions that is about 17. When at
least three pre-period months are available, the stricter test is a change beyond 2 standard deviations of that
series for two consecutive months. Otherwise "within normal month-to-month variation".

## Comparability notes

- **Depth changed** (quick → full): show it on the method page with `cards` and `scope`, and put a caveat on any
  count that rose because more pages were read.
- **Measured vs estimated page speed** (v6 baselines only): a jump from an estimate to a lab measurement isn't
  progress. v7 never estimates page speed, so this can't happen between two v7 audits.
- **Rounding**: the waterfall uses weighted like-for-like pillar changes (plus any "Gate cap" step); when they
  don't sum exactly to the headline change the renderer prints a rounding note. A gap of more than a point or so
  isn't rounding: check that the score blocks were copied, not typed.

## The data file

Name it `now-visibility-progress-<domain>-<YYYY-MM-DD>.json`. `*text*` makes the teal accent in headlines and
`**text**` is bold anywhere. Copy the shape of `assets/report/example-progress-v7.json`; `example-progress.json`
(v6 compatibility only) is kept local and is not in the public repo.

- `meta`: `domain`, `date` and `baselineDate` (as printed, short: "18 Nov"; the baseline is the original
  audit), `isoDate`, `preparedBy`, `scopeNote` (one line under the pillar chart; the renderer appends the
  like-for-like note and the raw move), `modelVersion` ("7.0"; refused if it disagrees with the score data),
  `formalTest` (true only at the quarterly re-audit; false or absent gives descriptive monthly output), and
  `blindRescore` (true when this month's checks and gates were filled in before the baseline `.scores.json` was
  opened; recorded, not printed, so the method lede must not claim a blind re-score when it is false).
- `scores`: `baseline` and `current`, each copied unchanged from that audit's `.scores.json`:
  ```
  {
    domain, date, isoDate, modelVersion: "7.0", depth,
    total, uncapped, range: [lo, hi], jrange: [lo, hi], band, confidence,
    pillars: {os, td, bq, sd, px},            // measured pillars only
    disciplines: {SEO: [met, assessed], AEO: [...], GEO: [...]},
    gates: {G1: "pass", ...}, checks: {OS1: "met", TD8: "na", ...},
    visibility: {tier, engines: [...], controls: [...]},
    disciplinesDetail: {SEO: {met, partial, notmet, unverifiable, total}, ...}
  }
  ```
  `checks` drives the like-for-like index and the "checks that changed" list; `gates` tells the renderer whether a
  gate cap applied (any `fail`). `total` is null and `jrange` is `[null, null]` for a range-only audit; the block
  is still accepted. v6 score blocks (`{total, seo, geo, aeo, pillars: {tc, cd, oa, se, pm}}`)
  are read only to re-render an old v6 report.
- `visibility`: `{baseline, current}`, each the `visibility` block from that side's `.scores.json`, unchanged
  (`baseline` from the original audit):
  - measured tier: `{tier: "measured", engines: [{engine, rate, se, lo, hi, answers, mentions, prompts, deff,
    mdc}], controls: [{name, engines: [{engine, rate, se, answers, mentions}]}]}`. Every engine needs `se` above
    zero, or the file is refused. The control set comes from the `competitors` counts in each audit's panel, so
    it is measured on the same answers as the client; keep the same competitor names in both audits.
  - proxy tier: `{tier: "proxy", engines: [{engine, answers, mentions}]}`.
  - an optional `note` on `current`. `baseline` may be `null` if the first audit had no panel.
  - The renderer runs the per-engine tests, the drift, the Holm correction and the verdict (or "Descriptive");
    don't type any of it.
- `history`: `[{label, total, range?}]`, oldest first, including this month, all on the same scoring model. The
  trend line appears from three points. `total` is each audit's raw index from its `.scores.json`, including
  measurement change; the cover's like-for-like figure changes with every pair of audits and isn't stored here.
- `story`: headlines and ledes. Keys: `coverHeadline`, `coverLede`, `scorecardHeadline`, `scorecardLede`,
  `fixedHeadline`, `fixedLede`, `statusHeadline`, `statusLede`, `startedLede`, `openHeadline`, `openLede`,
  `planHeadline`, `planLede`, `nextHeadline`, `nextLede`, `nextCallout`, `methodHeadline`. Any left out get a
  plain default built from the counts.
- `stats`: `[{from, to, label}]`, up to four.
- `fixed`: `[{area, evidence}]` · `started`: `[{area, progress, done, left}]` ·
  `unchanged`: `[{area, detail}]` · `newIssues`: `[{area, detail}]`.
- `planTracker`: `[{action, lane, window, status, note}]`.
- `nextSteps`: `[{title, detail, hours, effort, tag?: {text, kind}}]`, in priority order. `hours` 0 means
  ongoing. `kind` is `lime` (threshold), `teal`, `grey`, `critical` or `quick`.
- Optional pages, carried forward from the audit when they still matter:
  - `proof`: `{headline, intro, clusters: [{vertical, clients[], page, first?}], guardrail}`.
  - `offsite`: `{headline, overview, prNote, plays: [{name, sub, effort, start, end, ongoing?, marker?, note?}]}`
    (weeks 0–26).
  - `plan`: `{headline, lede, lanes: [{name, colour, cells: [[...], [...], [...]]}], ongoing: [{n, l}]}` for the
    next 90 days; items starting with `!` are threshold fixes.
- `method`: `{lede, cards: [{date, title, rows: [[label, value]]}] (baseline first), scope: [{label, value,
  inner?, text}], caveats: [{title, text}], next}`. Record platform events between the audits (engine model
  releases, new reports, policy changes) in `caveats`.

**v6 compatibility.** The old `citation` block (`{baseline: {hits, total, tier}, current: {...}, controls}`,
pooled across engines) is read only when re-rendering a v6 report. A v7 progress file uses `visibility`; the
renderer refuses a v7 file that carries `citation`.

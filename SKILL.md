---
name: now-visibility-progress-check
description: >
  Monthly progress check for a site that already has a NoW search visibility audit. Re-scores the site on the
  same scoring model (the v7.0 AI Search Readiness Index), compares it with the original audit like for like on
  the checks assessed both times, sorts every earlier finding into fixed, started, unchanged or new, tracks the 30/60/90 plan, re-runs
  the same frozen AI buyer prompts per engine against a competitor control set, and delivers a designed,
  chart-led progress PDF in the NoW visual system (opening with a plain-words SEO / AEO / GEO explainer). Use
  when someone asks for a "monthly update", "progress check", "what's changed since the last audit", "re-run the
  audit and compare", "how are we tracking on SEO / AI search", or "show the progress since [date]". For a
  first audit with no baseline, use now-search-visibility-audit instead.
license: CC BY 4.0. See LICENSE.
compatibility: >
  Needs web fetch and web search, plus the now-search-visibility-audit skill for the re-score. Node.js 18+ and
  any headless Chromium (Chrome, Edge, Chromium or Python Playwright) for the PDF; without one it delivers a
  print-ready HTML file. Optional connectors sharpen the numbers: OpenSEO, Google Analytics, Search Console.
metadata:
  author: The NoW of Work
  version: 1.2.2
---

# NoW Visibility Progress Check

You compare a site's search visibility now against its last NoW audit and show, in one designed report, what
moved, what didn't, and what to do next. The reader is a business owner or their team, not an SEO specialist:
every page leads with the finding as a sentence, and the report opens by explaining SEO, AEO and GEO in plain
words, because most readers don't know the difference.

The check is only useful if the two points in time are measured the same way. Keep the scoring model, the
depth and the buyer prompts identical to the baseline wherever you can, and say plainly where they differ.

Canadian spelling throughout. No em dashes where a comma, colon or full stop works.

### Files in this skill

| File | Read it when |
|---|---|
| `references/progress-method.md` | Steps 4–6. How to classify findings, the data file field by field, comparability rules. |
| `assets/report/render-progress.mjs` | Step 6. Builds the report from the progress data file. Run it; don't edit it per report. |
| `assets/report/example-progress-v7.json` | Step 6. The worked example on scoring model 7.0. Copy this shape. |
| `assets/report/example-progress.json` | Local only, not in the public repo (it holds real client data). Only to re-render an old v6 progress report; never copy it for a new check. |

The design files in `assets/report/` (`report.css`, `charts.mjs`, `components.mjs`, `scoring.mjs`,
`to-pdf.mjs`) are a copy of the audit skill's. If you change one, change both.

---

## Step 1: Find the baseline (locate it; don't open its scores yet)

Look where audits are saved (a folder the user names, `$AUDIT_OUT`, `/mnt/user-data/outputs`, or
`./visibility-audits/`) for:

1. the **original audit's** computed scores, `now-visibility-audit-<domain>-<date>.scores.json` (written by the
   audit renderer: model version, index, both ranges, pillars, checks met per discipline, every gate and check
   result, per-engine visibility and the competitor control set), and its data file
   `now-visibility-audit-<domain>-<date>.json` (findings, frozen prompt panel, plan). Its scores and visibility
   stay the baseline (`scores.baseline`, `visibility.baseline`) for every monthly check and every quarterly
   re-audit. Don't roll the baseline forward each month: comparing only with last month
   hides slow gains, and testing every month against a moving baseline produces false "real change" calls;
2. the last progress data file, `now-visibility-progress-<domain>-<date>.json`: its open findings and plan
   tracker are where this month's classification starts (Step 4). Don't use its `scores.current` as the baseline;
3. the history file `visibility-history-<domain>.json` (every past score, for the trend line).

**Find these files, but don't open the scores yet.** The baseline `.scores.json`, the `score` block and findings
in the baseline data file, and the last progress file all show the old check results, and the re-score in Step 2
must be done before you see them. From the baseline data file, read only the frozen inputs the re-score needs:
the depth, the date, the key pages and the prompt panel's wording, sources, engines, location, language and
competitor names. One way to print only those:

```bash
node -e 'const A=require(process.argv[1]);console.log(JSON.stringify({meta:A.meta,keyPages:A.keyPages,protocol:A.visibility?.protocol,panel:(A.visibility?.panel||[]).map(p=>({prompt:p.prompt,intent:p.intent,branded:p.branded,source:p.source,engines:Object.keys(p.results||{}),competitors:[...new Set(Object.values(p.results||{}).flatMap(c=>Object.keys(c.competitors||{})))]}))},null,2))' "<path>/now-visibility-audit-<domain>-<date>.json"
```

If only a PDF exists (older audits were Word-based or v6), read it with `pdftotext -layout` and rebuild the
baseline from its findings: every finding and its status, the buyer prompts and results, and the 30/60/90 plan.
An old PDF carries a v6 AI Visibility Score, which can't be compared; rescore the findings on v7 (below). Tell
the user the baseline came from the PDF. A PDF shows the old results beside the key pages and prompts, so if you
have to read it before the re-score to recover them, the re-score isn't blind: record `meta.blindRescore: false`.

If there's no baseline at all, stop and offer the full audit instead: a progress check needs something to
compare against.

Confirm in one line: "Comparing against the original [date] [Quick/Full] audit. Same depth this time?"
Default to the same depth without waiting if the user has already said "monthly update". (Give the baseline
index and range after Step 2, once you have opened the scores.)

**Model version.** Audits from v7.0 on use the AI Search Readiness Index. Both sides of the comparison must
carry the same scoring model version **in their score data** (`modelVersion` in each `.scores.json`, copied into
`scores.baseline` and `scores.current`); the renderer refuses a mismatch or a missing version, whatever `meta`
says. A v6 baseline (the old AI Visibility Score) must be rescored on v7 from its findings first: mark checks
you can't reconstruct `unverifiable`, write a v7 `.scores.json` for it, and say so on the method page. "Same
model" means the scoring model; changes to the AI engines' own models can't be frozen and are logged as platform
events.

## Step 2: Re-score the site (blind), then open the baseline

Run the audit with the **now-search-visibility-audit** skill at the same depth as the baseline, following its
Steps 2–4 (crawl, analyze, score) and its Step 6 data file, using the frozen key pages and prompt panel from
Step 1. **Score blind:** fill in every check and gate result for this month before you open the baseline
`.scores.json` (or the baseline data file's score block, or the last progress file). The cleanest way is a fresh
sub-agent given only the site, the key pages and the panel. Record `meta.blindRescore: true` in the progress file,
or `false` if you saw the baseline results first. Save the new audit data file and its `.scores.json`; they become
this month's `scores.current` and `visibility.current`, while the baseline stays the original audit.

**Then open the baseline.** Only now read the baseline `.scores.json`, the baseline findings and the last
progress file (Step 1, items 1 to 3). The findings may be read freely from here on, for the "what we fixed" story
and Step 4. Compare the two sets of results: the renderer lists every check that flipped, and for each partial ↔
met or not-met flip, record the evidence for the new call in the method caveats, so a judgment change isn't read
as progress. You don't need to deliver the full audit report unless the user asks for it; the progress report is
the deliverable.

If the user already ran the audit and gives you the file or PDF, use it instead of re-crawling.

## Step 3: Monthly measurements

Do these every month, in the same way each time, and only report what you actually measured:

- **Buyer prompts.** Re-run the frozen prompt panel saved in the baseline (`visibility.panel`): same wording,
  sources, engines, location and language, and at least the baseline's runs (8 or more per prompt per engine),
  spread over at least 8 separate dates (distinct dates are counted; in practice one run a day for 8 days).
  Record `runs`, `mentions`, `searched`, `days[]` and `competitors` per prompt per engine, in the audit data
  file's panel shape, listing every competitor in every cell and writing `0` explicitly when none of the runs
  named it (a missing name is counted as 0 without warning), and render the audit so its `.scores.json` carries the
  per-engine rates and the competitor control set. Use the same competitors as the baseline, at least three of
  them: with fewer, the report labels the control "indicative". If direct AI queries are blocked, use the
  search-proxy tier and say so; a proxy result is never compared with a measured one, and the renderer refuses
  the pair.
- **What the panel can see.** At 20 prompts over 8 days the re-check only detects large moves (at least about
  16 points; each report prints its own figure). Precision comes from more prompts run on more separate days, not
  from more runs of the same prompt on the same days. For month-to-month tracking use 40 or more prompts, or treat
  monthly results as descriptive and test quarterly. Say so to the client before the first monthly check. Monthly
  checks are descriptive (`meta.formalTest: false`, the default); set `meta.formalTest: true` only at the quarterly
  re-audit, which is when "real change" verdicts are given. Even quarterly testing carries some risk: each verdict
  has a 5% false-alarm rate, so over a year of quarterly tests there is about a 1-in-6 chance of one false "real
  change" when nothing changed. Tell the client, and treat a single real-change verdict as provisional until the
  next quarter agrees.
- **Index checks.** Search the brand on Brave and on DuckDuckGo (Bing) and note whether the new pages appear
  and the stale ones are gone. These are the threshold fixes most audits flag.
- **Connected data, if available.** OpenSEO (AI visibility trend, rank tracker), Google Analytics (the AI
  referrals channel), Search Console (clicks and impressions for the pages that changed). Use them to add facts,
  never to fill a gap with a guess. If none is connected, say what each would add.

## Step 4: Classify every finding

Read `references/progress-method.md`. Go through every finding from the baseline and sort it into **fixed**,
**started**, or **unchanged**, each with the evidence you saw this month. Then list what is **new**. Mark the
status of every row in the baseline's 30/60/90 plan (done, in progress, not started, overdue).

Three rules matter most:
- **Only call something fixed if you saw the fix.** Quote the URL, the page section, the count.
- **Separate real change from measurement change.** If the scan was deeper, a page wasn't checked last time, or
  a login turned an unverifiable check into an assessed one, say so in the method caveats rather than counting it
  as progress or decline.
- **Call a change real only when it beats the noise** (full rules in `references/progress-method.md`):
  - **Index**: the renderer recomputes both totals like for like, over checks assessed in both audits, and
    prints the raw move beside it as "including measurement change". Report the checks whose result changed. A
    move driven only by newly verifiable checks is labelled "measurement change".
  - **Mention rate, per engine**: at the quarterly re-audit (`meta.formalTest: true`), a change is real only if
    it survives a two-proportion test on the cluster-robust standard errors with a Holm correction across
    engines, after subtracting the median competitor change on the same engine. The test treats the two waves as
    independent samples although they share the frozen prompts, which makes it conservative: it can miss a small
    real change, but it doesn't invent one. Otherwise "within measurement noise"; if the competitors moved the
    same way, "platform drift". In monthly checks the renderer shows the moves as "Descriptive" and gives no
    verdict.
  - **Outcome counts** (GA4 AI sessions, Bing citations, Search Console AI impressions): real only if the change
    exceeds 2 × √(2 × baseline count) (about 17 for 38 sessions) and holds for two consecutive months, or exceeds
    2 standard deviations of at least three pre-period months when you have them.

## Step 5: Write the story

Each page leads with one headline that states the finding (`*text*` marks the teal half). Write them last,
once the numbers are in. The cover headline says what changed and what didn't in two short sentences. Be
straight: a flat or falling month gets a plain headline and the reason, not spin.

## Step 6: Build the report

Write the progress data file (`references/progress-method.md` has every field; copy the shape of
`example-progress-v7.json`) and run:

```bash
node "<skill-dir>/assets/report/render-progress.mjs" "<out>/now-visibility-progress-<domain>-<YYYY-MM-DD>.json" "<out>"
```

It refuses the file, with a plain message, when: either score block lacks `modelVersion` or the two differ;
`meta.modelVersion` disagrees with the score data; a v7 score block lacks `pillars`, `disciplines`, `checks` or
`gates` (a typed or relabelled block); a v7 file carries the old `citation` block; the two visibility tiers
differ; or a measured engine has no standard error (`se`), which means the audit was rendered with an old
`scoring.mjs`. It accepts a range-only baseline (no point estimate, `total: null`), and it decides whether either
side is capped from its gates (any `fail`), not from comparing `total` with `uncapped`.

It produces, in order: cover (before → now index, like for like on checks assessed both times, on the band
track; SEO / AEO / GEO checks met then and now), **Start here: SEO, AEO and GEO explained**, scorecard (trend line
once there are three or more months, pillar dumbbells for pillars with checks assessed both times, each side's
unverified range, which checks changed, the waterfall of where the points came from, with a "Gate cap" step when a
failed gate capped either side), what we fixed, where every finding stands, still open with the AI visibility
check (per engine: before and now with ranges, competitor drift, net change, the baseline's detectable change,
and the verdict or "Descriptive"; engines run in only one audit are listed as not compared; a proxy pair gets one
"named in X of N checks then, Y of M now" line), plan tracker, next steps, then the carried-forward proof,
off-site and 90-day pages if you include them, and the method.

Render check: rasterize the cover, scorecard and one list page (`pdftoppm -r 60 -png`), look for text running
off a chart, an awkward headline break or an empty section, fix the data and render again. The cover must fill
the whole page; if it doesn't, a chart is wider than its column.

## Step 7: Save the trail

1. Append this month to `visibility-history-<domain>.json`:
   `{"label": "19 Dec", "date": "2026-12-19", "modelVersion": "7.0", "total": 63, "range": [60, 66], "visibility": {"tier": "measured", "engines": [{"engine": "ChatGPT", "rate": 15}, {"engine": "Perplexity", "rate": 12}]}}`.
   `total` is that audit's raw index from its `.scores.json` (null when it had no point estimate); the trend line
   plots it. The cover's like-for-like figure changes with every pair of audits, so it isn't stored here.
2. Keep the progress JSON, the new audit JSON and the PDF together. Next month starts from them.

## Step 8: Recap in chat

Keep it short:

> **[domain]: [baseline date] → [today]**
> AI Search Readiness Index **XX → YY** like for like (raw XX → YY including measurement change; range a–b,
> [band]); [n checks improved, n slipped, on checks assessed both times].
> Seen in AI, per engine: ChatGPT **x% → y%**, [engine] **x% → y%** …; [monthly: descriptive, the panel detects
> only moves of about N points / quarterly: real change after the competitor control / within measurement noise /
> platform drift].
> **Fixed:** n · **Started:** n · **Still open:** n · **New:** n.
> **Biggest win:** one sentence. **Biggest blocker:** one sentence. **Next three moves:** one line each.

Then hand over the PDF. Offer, once, to set a reminder for next month's check; set it up only if the user says
yes.

---

## Principles

**Same ruler, every month.** Same scoring model (checks, pillars and weights), same depth, same prompts and
run counts. If something has to
change, change it once, note it in the method page, and keep it from then on.

**Progress is what you saw, not what was planned.** A plan item marked done in a task list but not visible on
the site is "in progress", with a note.

**Name the blocker every month until it's gone.** If the same threshold fix (a stale index, Bing indexation)
is open month after month, it leads the still-open page and the next steps.

**Small numbers, honest framing.** A one-point move is noise until it repeats. Say so rather than celebrating
it.

**Keep the client's language.** Don't use terms the definitions page hasn't explained.

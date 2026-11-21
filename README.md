# NoW Visibility Progress Check

**A Claude skill from [The NoW of Work](https://nowofwork.com).** The monthly companion to the
[NoW Search Visibility Audit](https://github.com/NoW-of-Work/now-search-visibility-audit).

Once a site has had a NoW search visibility audit, this skill re-checks it and shows what actually moved, in the
same designed, chart-led PDF format. It is built to answer one question honestly: did the work change anything,
or is the difference just noise?

---

## What it does

1. **Finds the baseline.** It reads the original audit's data and score files. The baseline is always the
   original audit, not last month, so slow real gains aren't lost and false alarms don't pile up.
2. **Re-scores the site** with the audit skill, on the same scoring model, the same key pages and the same
   frozen panel of buyer questions. Checks are re-scored before the baseline scores are opened.
3. **Compares like for like.** The index is compared only over checks assessed in both audits. A check that
   merely became verifiable this time is reported as a measurement change, not progress.
4. **Sorts every earlier finding** into fixed, started, unchanged or new, and tracks each item in the 30/60/90 plan.
5. **Re-runs the same AI buyer prompts** per engine, against a control set of competitors, so a shift that hit
   everyone is called platform drift.
6. **Tests change honestly.** Monthly checks report mention rates for information. A formal "real change" or
   "within noise" verdict is given at the quarterly re-audit, against the original audit, per engine, with a
   Holm correction across engines.

The report opens with a plain-words page explaining SEO, AEO and GEO and what each means for the business.

**What a re-check can see.** At 20 prompts run once a day for 8 days, a re-check can only detect a change in mention
rate of about 16 points or more. Precision comes from more prompts run on more separate days, not from more runs
of the same prompt on the same days. Every report prints its own figure, so the client knows before buying
monthly tracking.

---

## Using it

> "Run the monthly progress check for example.com."
>
> "What's changed since the last audit?"
>
> "Show the progress since October."

For a first audit with no baseline, use the
[NoW Search Visibility Audit](https://github.com/NoW-of-Work/now-search-visibility-audit) instead.

---

## Installation

**Claude desktop app or claude.ai**

1. Download `now-visibility-progress-check.zip` from the
   [latest release](https://github.com/NoW-of-Work/now-visibility-progress-check/releases/latest).
2. In Claude, open **Settings → Capabilities → Skills** and click **+**.
3. Upload the ZIP. Install the audit skill the same way; this skill uses it for the re-score.

**Claude Code**

```bash
git clone https://github.com/NoW-of-Work/now-visibility-progress-check.git ~/.claude/skills/now-visibility-progress-check
```

### Requirements

- Web fetch and web search, and the NoW Search Visibility Audit skill (v7.0 or later).
- Node.js 18 or later (no packages to install) and any headless Chromium for the PDF: Chrome, Edge, Chromium,
  Brave, or Python Playwright. Without one you get a print-ready HTML file.
- Optional: OpenSEO, Google Analytics or Search Console connectors for sharper numbers.

---

## How it's built

```
now-visibility-progress-check/
├── SKILL.md                        ← the workflow Claude follows
├── references/
│   └── progress-method.md          ← re-audit rules, statistics, the data file field by field
├── assets/report/
│   ├── render-progress.mjs         ← builds the progress report from its data file
│   ├── scoring.mjs, charts.mjs, components.mjs, report.css   ← shared with the audit skill
│   ├── to-pdf.mjs                  ← prints the HTML with any headless Chromium
│   └── example-progress-v7.json    ← a complete worked example (fictional firm)
├── LICENSE
└── README.md
```

The shared files in `assets/report/` are byte-identical copies of the audit skill's. If you change one, change
both.

---

## Version history

**1.2.1**: Report layout fix. Long labels wrap instead of shrinking the whole PDF (shared `report.css`, same as audit 7.0.1). Method unchanged.

**1.2.0**: First public release. Scoring model v7.0: like-for-like index on checks assessed in both audits,
fixed original baseline, descriptive monthly checks and formal quarterly tests (per engine, cluster-robust
errors, t reference, Holm correction, competitor drift), blind re-scoring, honest detectable change, refusals
for mismatched models, tiers or data shapes.

---

## Credits and licence

© 2026 The NoW of Work. Licensed under [Creative Commons Attribution 4.0 International (CC BY
4.0)](https://creativecommons.org/licenses/by/4.0/). You can use, share and adapt it, including commercially, as
long as you credit The NoW of Work and link to the licence. See `LICENSE`.

The licence covers the skill's text, not The NoW of Work's name or logo. "The NoW of Work" and "The Future is
NoW" are marks of The NoW of Work. If you publish a modified version, remove the NoW branding from the report or
make clear it isn't an official NoW of Work release.

Questions or client work: [ai@nowofwork.com](mailto:ai@nowofwork.com)

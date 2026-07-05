# Outcome Loop — Design Spec
*Written July 5, 2026 by Claude (Fable 5). The audit's verdict: this is the single highest-value thing Perfect Racket can build — it converts click data (curiosity) into labeled outcomes (truth), creating the dataset nobody in tennis has, the evidence base that eventually replaces hand-tuned scoring weights, and the strongest possible acquisition asset. The build itself is deliberately simple; this spec exists so the simple build collects the RIGHT data.*

## What we're collecting
Per fitted player, over time: **did they act (demo/buy), what did they choose, and did it work** (game outcome, arm outcome). Each label ties to their profile + recommendation + `scoring-version`, so outcomes can be analyzed per segment and per algorithm version.

## The mechanism (recommended: one-tap outcome links)
A follow-up email ~10 days after `report_url` is set, containing **three plain links** — each a URL to a tiny Netlify function that logs the outcome and lands on a friendly page:

```
/outcome/{reportId}/bought    → "Got it — how's it playing? Reply and tell me."
/outcome/{reportId}/demoed    → "Nice — the next-morning test is the honest one. Reply with the verdict."
/outcome/{reportId}/not-yet   → "No rush — your report isn't going anywhere."
```

Why links over reply-parsing: structured data at zero friction (one tap from a phone), no manual transcription, and every tap still invites a reply for the qualitative layer. Why not a survey form: each added field halves completion; three links IS the survey.

### Function: `outcome-log.mjs` (mirror generate-report's patterns)
- `GET /outcome/:reportId/:outcome` — validate reportId against the reports store (same regex + existence check as report-view), validate outcome ∈ {bought, demoed, not-yet, returned, arm-better, arm-same}, then `setJSON` into an `outcomes` blob store keyed `{reportId}:{ts}`: `{ reportId, emailHash (from report record), outcome, topRacket, scoringVersion, promptVersion, ts }`.
- Multiple events per player are a feature (demoed → later bought): append, never overwrite.
- Render a branded thank-you page (reuse report-view's shell) with the reply prompt.
- Rate limiting: reuse the per-IP pattern, generous (30/hr) — these are one-tap links.
- Security notes: reportIds are already unguessable; logging is idempotent-safe; no personal data in the URL; noindex the landing pages.

### Kit automation
Trigger: `report_url` field set (covers new quiz-takers automatically) → wait 10 days → send. For the 627-backlog cohort, one manual broadcast ~July 16 does the same job (they all hit day-10 together — a one-time data bonanza).

### Email copy (draft — Tucker's voice pass required)
> **Subject:** did you try it?
> Hey — Tucker here. Ten days ago I sent your fitting report (the {{ subscriber.top_racket }}). Quick one, one tap:
> **I bought it** · **I demoed it** · **Not yet**
> That's it — it tells me whether the fitting actually worked, which makes the next player's fitting better. And if you've hit the court with it: hit reply, tell me how the first hour felt. I read every one.

## How labels feed scoring (the payoff)
- Phase 1 (immediately useful): per-segment action rate — "% of fitted players who demo/buy within 30 days" by NTRP/mode/frame. Frames with high recommendation volume but low action rate are the empirical version of the Pure Drive flag. This is also THE acquisition slide.
- Phase 2: a `--outcomes` mode in test-scoring.mjs — replay outcome-labeled profiles and score any candidate weight change by whether it would have ranked *acted-on* frames higher. Weight changes stop being opinions.
- Phase 3 (someday, needs volume): arm-outcome labels ("arm-better" at 60 days) validate the arm-health engine's core promise — the claim no competitor can make with data.

## Success metrics
- ≥8% of the backlog cohort taps any link (industry re-engagement click norms make this ambitious-but-real)
- ≥100 labeled outcomes within 60 days of launch
- First per-segment action-rate report produced within 90 days

## Build estimate
One function (~150 lines, patterns all exist), one Kit automation, one email. A competent session — any model — executes this spec in an afternoon. The design was the hard part; it's done.

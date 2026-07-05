# Perfect Racket — Scoring Change Runbook
*How to change anything in the scoring engines without breaking fittings you can't see.
Written July 2026 alongside the full algorithm audit (`algorithm-audit-2026-07-04.md` — read it first).*

## The one rule

**Never change a scoring weight, bonus, penalty, normalization bound, or DB spec without running the regression suite before and after.** The engines decide by razor margins (median #1-vs-#2 gap: 0.27 points), so a change that "obviously only affects X" will re-rank profiles you never thought about. The suite exists so you *see* every re-ranking instead of discovering it from a confused user.

## The loop

```
# 1. BEFORE touching anything — snapshot current behavior:
node test-scoring.mjs --save-baseline

# 2. Make your change in src/PerfectRacket.jsx
#    (both engines? ntrpTierAdjustment is performance-mode; computeWeights is arm-mode —
#     many concepts exist in BOTH places and must be changed twice deliberately or once deliberately)

# 3. AFTER the change:
node test-scoring.mjs path/to/latest-submissions.csv

# 4. READ THE DIFF. Every line. For each changed profile ask:
#    - Is the NEW top-3 what a good fitter would short-list for that person?
#    - Is the OLD top-3 clearly worse? (If they're equally defensible, your change is churn, not improvement.)
#    - Did anything change OUTSIDE the segment you intended? If yes, you don't understand your change yet. Stop.

# 5. Bump SCORING_VERSION in src/PerfectRacket.jsx (const near the top). Always.

# 6. Deploy, then immediately re-save the baseline:
node test-scoring.mjs --save-baseline
git add scoring-baseline.json && git commit -m "baseline after <change>"
```

## What the suite measures

- **#1 surfacing distribution** across a 1,008-profile grid (both modes × NTRP × style × swing × priority/comfort × pain) — watch for any single frame creeping past ~10% of wins (homogenization) and for the **never-in-top-3 list** growing (dead inventory; it was 13/42 pre-P1, 12/42 post).
- **NTRP≤3.0 sub-285g share** — the audit's F1 metric. Post-P1 target zone: ~20–25% on real data (the remaining light picks should be Slow & Controlled swingers and demonstrated-light current-racket players, where light is *correct*).
- **Real-submission replay** (pass a CSV) — the surfacing mix your actual traffic gets.
- **Full baseline diff** — every profile whose top-3 changed, was vs now.

## Known landmines (learned the hard way)

1. **Normalization bounds ≠ DB reality.** Several `norm(x, lo, hi)` bounds are far wider than the DB's actual spec range (head size normed 95–115; DB spans 97–100), so *documented* weights are not *effective* weights — the power score is beam-dominated in practice. Recalibrating bounds is the P2 project: it re-ranks the entire catalog and must be done as one deliberate session with before/after surfacing reports, never as a drive-by.
2. **Two engines, duplicated concepts.** Arm-health and performance paths implement maneuverability floors, tier logic, etc. separately. A fix applied to one silently leaves the other's behavior unchanged — decide *explicitly* each time whether the other engine should match.
3. **`ntrpTierAdjustment(r, ntrp, currentWeight, swingSpeed)`** has two call sites. Change the signature → change both.
4. **Specialist status lives on DB rows** (`specPower` / `specSpin` / `specControl` flags) as of P1. When refreshing the DB or renaming a model generation (Blade v9→v10 happened once already), carry the flags to the new row — the suite's surfacing report will show specialist frames vanishing if you forget.
5. **The 285g maneuverability floor** (both engines) is the structural defense against ultra-light frames winning on raw lightness. Do not remove it to "fix" a light frame not surfacing — surface it through tier logic instead.
6. **Baseline discipline:** `scoring-baseline.json` must always describe the *deployed* engine. If the diff shows changes you didn't make, someone changed code without re-saving — investigate before trusting anything.

## Version history

- **v4** (May–June 2026): performance mode shipped; maneuverability weight floor; ATP/WTA sanity validation.
- **v5.0-2026-07** (P1, this package): swing-speed-as-strength at NTRP≤3.0 (audit F1/F2); "Comfort first" comfort-weight floor of 0.24 (F7); `scoring-version` captured with every submission (F9); specialist flags moved onto DB rows (R2, behavior-neutral, verified). Evidence: real-traffic low-NTRP sub-285g #1 rate 57%→23%; zero changes at NTRP≥3.5; the canonical "muscular 2.5, fast swing" profile moves from Speed MP UL (265g) to Blackout V2 300 / Extreme MP / Boom MP (all 300g).

## The future of tuning (from the audit)

Hand-tuned weights are v1-appropriate and defensible *because* this runbook exists. The endgame is replacing judgment with evidence: once the outcome-loop email is collecting labeled outcomes (demoed / bought / kept / arm improved), weight changes should be justified by outcome data, and the suite grows an outcomes-replay mode. Until then: every change through this loop, no exceptions, including changes suggested by an AI — *especially* those.

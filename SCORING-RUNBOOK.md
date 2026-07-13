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

- **v6.0-2026-07** (P2, catalog recalibration): all 27 normalization bounds recalibrated to padded DB ranges (~15% margin — full min-max proved too aggressive, eroding P1's tier authority; padded restores balance); ≤3.0 tier points scaled ×1.5 to match the new variance; **control-density SIGN FIX** — `normInv(density)` in the control subscore had the physics inverted in BOTH engines (dense pattern scored as anti-control; the deep root of audit F5), now `norm(density)` at modest weight (perf 0.20 / arm 0.15) with head size promoted to the dominant control signal; 4.5+ heavy/dense AND-gate split (heavy earns +5 alone, dense stacks +3); maneuverability weight ×0.70 at 4.5+ (advanced players supply their own racket-head speed); low-NTRP forgiveness gate (density ≥340 −8, headSize ≤98 −5 at ≤3.0 — weight-appropriate ≠ spec-appropriate). Results: dead inventory 12→5 (Gravity Pro/Tour, Percept 97, Blade 18x20, Speed Pro/Tour all correctly alive; Gravity Pro floors at NTRP 4.0), Boom grid share 20%→7%, real margins median 0.27→0.52pts, low-NTRP sub-285 23.2% (P1 intact), canonical cases pass (5.0 S&V Control now gets Blade 18x20 > Gravity Pro — an improvement). Watch items for outcome data: Boom 14.1% real share (demand concentration, accepted), Pure Drive 13.5% (click-data flag unresolved — let outcomes decide).

- **v6.1-2026-07** (DB freshness, July 13): two catalog corrections, no weight/bound changes. (1) **Ki Q+5 DELISTED from recommendations** — the real Q+5 left Tennis Express; its slug resolved to the Ki Q+5X Pro, a different frame (27.5"/310g). Affiliate slug removed → out-of-stock convention excludes it in both engines; DB row + dropdown kept for current-racket lookups/comparisons. (2) **Ultra 100 v4 → v5** per TE spec sheet: SW 318→326, balance 6→4 pts HL, beam 26→26.5 (max convention), price $249→$299 (crosses budget brackets — display/flag only; price is in no subscore); RA 68 unchanged per TE; weight/head/pattern unchanged; specPower flag + POWER_SPECIALISTS + dropdown + affiliate key all carried. EVIDENCE: combined grid diff 263/1008 (Ki 82 · Ultra 180 · both 1), ZERO changes outside the two frames' segments; Ki was Nº1×12 (all performance; mainstream replacements), arm-health displacements all mild-pain tier with 46/49 landing on armFriendly RA 55–62 frames (3 accepted 2.5-tier slot-3 Speed MP UL backfills); Ultra ENTERED 52 boards (Power/Performance-first/Balanced — physically correct for +8 SW and wider beam), DROPPED 66 (36 Comfort-first + 6 Maneuverability — equally correct), representative margins 0.06–0.23 (razor-tie class, F3); real-app severe-pain probe: Ultra v5 scores dead-last (16.03) with injuryFactor 1.0 — the arm promise is intact. Canonical cases pass verbatim. WATCH: Speed MP L grid #1 share 12.8% (was ~11.7% pre-change — creeping past the ~10% guideline; existing trend, not introduced here; let outcome data arbitrate before tuning). SUITE BLIND SPOT FOUND (not fixed here — baseline comparability): the grid's severe tier uses "Sharp pain during play", which is NOT an app value and scores as zero pain — the suite has never exercised real severe-pain scoring; fix = its own deliberate commit + baseline re-save with Tucker's go.

## The future of tuning (from the audit)

Hand-tuned weights are v1-appropriate and defensible *because* this runbook exists. The endgame is replacing judgment with evidence: once the outcome-loop email is collecting labeled outcomes (demoed / bought / kept / arm improved), weight changes should be justified by outcome data, and the suite grows an outcomes-replay mode. Until then: every change through this loop, no exceptions, including changes suggested by an AI — *especially* those.

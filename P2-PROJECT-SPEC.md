# P2 Project Spec — Catalog Recalibration & Dead-Inventory Rescue
*Written July 5, 2026 by Claude (Fable 5) as a capability-transfer artifact: this spec is detailed enough to be executed by a future AI session or engineer WITHOUT the original context. Prerequisites: read `algorithm-audit-2026-07-04.md` and `SCORING-RUNBOOK.md` first. Execute ONLY with Tucker's explicit go, ONLY after P1 has deployed and settled, and ONLY as a single dedicated session — this project re-ranks the whole catalog.*

## Objectives (audit findings F3–F6)
1. **F6:** make documented weights ≈ effective weights by recalibrating normalization bounds to the DB's real spec ranges.
2. **F5:** reduce never-in-top-3 frames from 12/42 to ≤5/42 — every rescued frame must surface for profiles where a fitter would genuinely short-list it (rescue is NOT the goal; correct surfacing is).
3. **F4:** no single frame wins #1 in >12% of grid profiles (Boom MP currently ~20%).
4. **F3:** (stretch) tie-break diversification so sub-0.3-point wins don't always fall to the same generalist.

## Ground truth from the July 5 probe (already measured — do not re-derive)
Recalibrating ONLY the performance-mode power/control/spin bounds to DB ranges (headSize 97–100, beam 20–26, SW 293–335, RA 54–71, density 304–360), with NO weight retuning:
- **441/1008 grid profiles change; #1 changes in 267.** This is the project's minimum blast radius. Budget review time accordingly — every diff line gets adjudicated.
- Dead inventory improves only 12→11 (Speed Tour 97 rescued). **Recalibration alone does not fix F5.**
- P1's low-NTRP protections survive recalibration unchanged (23.2% real-traffic sub-285 — the target zone).

## Workstreams, in order

### W1 — Bounds recalibration (both engines)
Replace norm bounds with DB p5–p95-ish ranges. Starting values (from the probe; re-verify against the DB at execution time since frames may have been added):
`headSize 97–100 · beamWidth 20–26 · swingWeight 293–335 · weight 265–335 · RA 54–71 · density 304–360`.
Apply to BOTH engines (arm-health `computeSubscores`/`computeFrameComfort` AND `performanceSubscores`) — the audit's landmine #2. After recalibration, the *intended* weights become real for the first time, so expect the sub-score balances themselves to need a second look: in particular, head size will suddenly matter (it currently barely does), and beam width will stop being the secret king of the power score.

### W2 — Dead-inventory rescue (the judgment-heavy part)
The 11–12 dead frames are heavy control frames. Known mechanical causes, with the specific levers:
- **The 4.5+ heavy/dense bonus requires density ≥320** — a 16x19 pattern (=304) can never qualify, which locks out Gravity Tour/Pro, Percepts, Speed Pro. Lever: split the bonus — weight ≥305 earns its part regardless of pattern; density adds on top.
- **Maneuverability weighting punishes SW 320+ everywhere.** Lever: at NTRP ≥4.5, reduce maneuverability's playstyle weight (these players supply their own racket-head speed) OR floor the SW input like the 285g weight floor.
- **Control-specialist +6 is diluted across 11 flagged frames.** Lever: tier the flags (elite vs standard specialist) or raise the bonus at 4.5+ only.
Acceptance per rescued frame: name the profile class it now surfaces for and defend it in one sentence a stringer would accept ("Gravity Pro for 4.5+ slow-to-moderate swing control-first all-courters" — yes; "it surfaces randomly at 3.5" — revert).

### W3 — Homogenization guard (Boom MP)
After W1+W2, re-measure Boom's #1 share. If still >12%: examine which of its wins are sub-0.5-point margins (use the audit's margin methodology) and prefer structural fixes (does its balance:5 inflate comfort's 0.20 balance term?) over an ad-hoc Boom penalty. A hardcoded "-2 for Boom" is a smell — find WHY it wins ties.

### W4 — Version + docs
Bump `SCORING_VERSION` to v6.0. Update the runbook's version history. Re-save and commit the baseline. Update WIP.

## Acceptance criteria (all must hold before deploy)
- Canonical expert cases unchanged or improved (rerun the audit's six: 5.0 S&V control → Blade/TFight/VCORE class; 4.5 spin → SX300/VCORE/Aero class; etc.)
- Real-traffic NTRP≤3.0 sub-285g stays in the 20–25% zone (P1's fix intact)
- Dead frames ≤5/42, each rescue defended
- Max single-frame #1 share ≤12% on the grid
- Every diff line adjudicated per the runbook ("if you can't explain a shift, you don't understand your change")
- Tucker reviews the before/after surfacing report and signs off BEFORE deploy

## Anti-goals
- No new questions, no DB additions, no arm-health-philosophy changes, no touching P1's tier logic (it just shipped), no "while we're in here" — scope discipline is the point of the spec.

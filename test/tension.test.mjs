// Tension prescription tests — the regression suite (test-scoring.mjs) diffs
// top-3 RACKET picks only, so tension changes are invisible to it. This file
// closes that gap.
//
// Core invariant (July 27): the tension we print must be safe FOR THE STRING WE
// PRESCRIBE. Natural gut strung loose plays like a trampoline and is not what a
// hurting player should be handed; poly can legitimately go low because it's stiff.
// Run: npm run test:tension
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const ROOT = new URL("..", import.meta.url).pathname;
const src = readFileSync(`${ROOT}src/PerfectRacket.jsx`, "utf8");
const ENTRY = `${ROOT}.tension-entry.jsx`, OUT = `${ROOT}.tension-bundle.mjs`;
writeFileSync(ENTRY, src + "\nexport { generateRecommendations, generateRecommendationsPerformance };\n");
execSync(`npx esbuild ${ENTRY} --bundle --loader:.jsx=jsx --jsx=automatic --format=esm --outfile=${OUT} --external:react --external:react-dom --external:react/jsx-runtime --log-level=error`, { cwd: ROOT, stdio: "inherit" });
const mod = await import(pathToFileURL(OUT).href + "?t=" + Date.now());
rmSync(ENTRY); rmSync(OUT);

// Minimum tension by string type. Gut/multi are soft and lively — strung too
// loose they lose control and add power a hurting arm has to fight. Poly is
// stiff, so low tension is the correct arm-friendly move for it.
const FLOOR = { "Natural Gut": 48, "Multifilament": 46, "Synthetic Gut": 44, "Polyester": 42 };
const CEILING = 58;

const base = { name: "P", email: "p@x.com", ageRange: "46-55", playFrequency: "1-2x/wk", gripSize: "4⅜",
  currentRacket: "", budget: "No preference", goals: [], pastInjuries: [], pastInjuryElbow: "No",
  pastInjuryShoulder: "No", pastInjuryWrist: "No", rehabStatus: "", tensionRange: "", playStyle: "Baseliner" };

const NTRP = ["2.5", "3.0", "3.5", "4.0", "4.5+"];
const SWING = ["Slow & Controlled", "Moderate", "Fast & Aggressive"];
const PAIN = ["No issues", "Mild discomfort after playing", "Pain during play but manageable", "Severe pain that limits play"];
const CUR = ["Polyester", "Multifilament", "Natural Gut", "Synthetic Gut", "Not Sure"];
const CVP = ["Comfort first", "Balanced", "Performance first"];
const PRIO = ["Power", "Control", "Spin", "Maneuverability", "Balanced"];

const armProfiles = [];
for (const ntrp of NTRP) for (const swingSpeed of SWING) for (const painSeverity of PAIN)
  for (const stringType of CUR) for (const comfortVsPerf of CVP)
    armProfiles.push({ ...base, mode: "armhealth", ntrp, swingSpeed, painSeverity, stringType, comfortVsPerf,
      painLocations: painSeverity === "No issues" ? [] : ["Elbow"] });
const perfProfiles = [];
for (const ntrp of NTRP) for (const swingSpeed of SWING) for (const priorityFocus of PRIO)
  perfProfiles.push({ ...base, mode: "performance", ntrp, swingSpeed, priorityFocus, comfortVsPerf: "", painSeverity: "", painLocations: [] });

const run = (d) => d.mode === "performance" ? mod.generateRecommendationsPerformance(d) : mod.generateRecommendations(d);
const label = (d) => `${d.mode}|${d.ntrp}|${d.swingSpeed}|${d.painSeverity || d.priorityFocus}|cur=${d.stringType || "-"}`;

let pass = 0;
const t = (name, fn) => { try { fn(); pass++; console.log("  ok  " + name); } catch (e) { console.error("FAIL  " + name + "\n      " + e.message); process.exitCode = 1; } };

console.log("— Tension floors: never prescribe a string below its safe minimum —");

t("ARM: no prescription starts below its string type's floor", () => {
  const bad = [];
  for (const d of armProfiles) {
    const r = run(d), top = r.strings[0];
    if (r.tension.recommended < FLOOR[top.type]) bad.push(`${label(d)} -> ${top.type} @ ${r.tension.recommended} (floor ${FLOOR[top.type]})`);
  }
  assert.equal(bad.length, 0, `${bad.length} profiles under floor, e.g.\n        ` + bad.slice(0, 4).join("\n        "));
});

t("ARM: no NUMBER shown (range low) falls below the floor", () => {
  const bad = [];
  for (const d of armProfiles) {
    const r = run(d), top = r.strings[0];
    if (r.tension.low < FLOOR[top.type]) bad.push(`${label(d)} -> ${top.type} range low ${r.tension.low} (floor ${FLOOR[top.type]})`);
  }
  assert.equal(bad.length, 0, `${bad.length} profiles print a number under floor, e.g.\n        ` + bad.slice(0, 4).join("\n        "));
});

t("PERF: same floors hold (gut is reachable here too)", () => {
  const bad = [];
  for (const d of perfProfiles) {
    const r = run(d), top = r.strings[0];
    if (r.tension.recommended < FLOOR[top.type] || r.tension.low < FLOOR[top.type]) bad.push(`${label(d)} -> ${top.type} @ ${r.tension.low}-${r.tension.high}`);
  }
  assert.equal(bad.length, 0, bad.slice(0, 4).join("; "));
});

t("THE BUG CASE: severe pain + poly + 3.0 + slow -> gut, was 42, now >= 48", () => {
  const d = { ...base, mode: "armhealth", ntrp: "3.0", swingSpeed: "Slow & Controlled",
    painSeverity: "Severe pain that limits play", painLocations: ["Elbow"], stringType: "Polyester", comfortVsPerf: "Comfort first" };
  const r = run(d);
  assert.equal(r.strings[0].type, "Natural Gut", "precondition: this profile gets gut");
  assert.ok(r.tension.recommended >= 48, `start ${r.tension.recommended} must be >= 48`);
  assert.ok(r.tension.low >= 48, `range low ${r.tension.low} must be >= 48`);
  assert.ok(!/at 4[0-7]/.test(r.stringerScript), "stringer script must not quote sub-48 gut: " + r.stringerScript);
});

console.log("— Invariants preserved —");

t("ceiling: START still clamped at 58 (pre-existing: printed HIGH reaches 60 — see note)", () => {
  // NOTE (July 27): the 58 clamp has always been applied to `base` while the
  // printed range is base±2, so the top number shown has always been 60. That's
  // the mirror image of the floor bug, but it is NOT in this change's scope
  // (raising/lowering a ceiling moves prescriptions Tucker didn't authorize).
  // Asserting the ACTUAL long-standing invariant so this test tells the truth;
  // the asymmetry is logged in the WIP as a separate decision for Tucker.
  for (const d of [...armProfiles, ...perfProfiles]) {
    const r = run(d);
    assert.ok(r.tension.recommended <= CEILING, `${label(d)} start ${r.tension.recommended} > ${CEILING}`);
  }
});

t("range is coherent: low <= recommended <= high, and high = rec + 2", () => {
  for (const d of [...armProfiles, ...perfProfiles]) {
    const r = run(d), { low, recommended, high } = r.tension;
    assert.ok(low <= recommended && recommended <= high, `${label(d)} incoherent ${low}/${recommended}/${high}`);
    assert.equal(high, recommended + 2, `${label(d)} high should be rec+2`);
  }
});

t("UNFLOORED cases are byte-identical to the legacy formula (no silent drift)", () => {
  // legacy arm-mode formula, reproduced exactly
  const legacyArm = (d) => {
    const PAIN_N = { "No issues": 0, "Mild discomfort after playing": 3, "Pain during play but manageable": 6, "Severe pain that limits play": 9 };
    let b = 52; const pn = PAIN_N[d.painSeverity] || 0;
    if (pn >= 6) b -= 6; else if (pn >= 3) b -= 3;
    if (d.stringType === "Polyester") b -= 2;
    if (d.stringType === "Natural Gut") b += 2;
    const n = parseFloat(d.ntrp) || 3.5;
    if (n >= 4.0) b += 2; else if (n <= 3.0) b -= 2;
    if (d.swingSpeed === "Fast & Aggressive") b += 2; else if (d.swingSpeed === "Slow & Controlled") b -= 2;
    return Math.min(58, Math.max(42, b));
  };
  let checked = 0;
  for (const d of armProfiles) {
    const r = run(d), legacy = legacyArm(d);
    if (legacy >= FLOOR[r.strings[0].type]) { // not a floored case -> must be unchanged
      assert.equal(r.tension.recommended, legacy, `${label(d)} drifted: ${r.tension.recommended} vs legacy ${legacy}`);
      checked++;
    }
  }
  assert.ok(checked > 200, `expected many unfloored cases, checked ${checked}`);
  console.log(`      (${checked} unfloored profiles verified identical)`);
});

console.log(`\n${pass} checks passed${process.exitCode ? " — WITH FAILURES" : ", 0 failures"}`);

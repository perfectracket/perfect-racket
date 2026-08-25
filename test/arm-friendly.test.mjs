// armFriendly derivation guard — armFriendly must never be hand-set on a DB row.
// The Aug 25, 2026 catalog audit found rows flagged arm-friendly whose own RA
// said otherwise; the flag drives scoring (antiComfortPenalty, arm-specialist
// penalty) AND a user-facing "Arm Friendly" badge, so a drifted row is a broken
// promise to the exact users the arm-health path exists to protect.
// This test enforces the structure, not a snapshot: derived from RA, with
// editorial exceptions possible ONLY via a commented armFriendlyOverride.
// Run: npm run test:armfriendly
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const ROOT = new URL("..", import.meta.url).pathname;
const src = readFileSync(`${ROOT}src/PerfectRacket.jsx`, "utf8");

// -- structural: no bare armFriendly on any DB row -------------------------
const bare = src.match(/armFriendly:\s*(?:true|false)/g) || [];
assert.equal(bare.length, 0,
  `${bare.length} DB row(s) still hand-set armFriendly. It is derived from RA now; use armFriendlyOverride with a comment.`);

// -- every override must carry a comment explaining itself -----------------
const overrideLines = src.split("\n").filter((l) => l.includes("armFriendlyOverride:"));
const rowOverrides = overrideLines.filter((l) => l.trimStart().startsWith("{ brand:"));
assert.ok(rowOverrides.length > 0, "expected at least one editorial override row");
for (const line of rowOverrides) {
  assert.ok(/\/\/.*editorial/i.test(line),
    `armFriendlyOverride without an "// editorial:" comment explaining why:\n  ${line.trim().slice(0, 120)}`);
}

// -- behavioral: the helper honors RA, the cutoff, and overrides -----------
const ENTRY = `${ROOT}.af-entry.jsx`, OUT = `${ROOT}.af-bundle.mjs`;
writeFileSync(ENTRY, src + "\nexport { armFriendlyOf, RACQUET_DB, SETTINGS };\n");
execSync(`npx esbuild ${ENTRY} --bundle --loader:.jsx=jsx --jsx=automatic --format=esm --outfile=${OUT} --external:react --external:react-dom --external:react/jsx-runtime --log-level=error`, { cwd: ROOT, stdio: "inherit" });
const mod = await import(pathToFileURL(OUT).href + "?t=" + Date.now());
rmSync(ENTRY); rmSync(OUT);

const CUT = mod.SETTINGS.RA_ArmFriendly_Cutoff;
assert.equal(mod.armFriendlyOf({ ra: CUT }), true, "RA exactly at the cutoff is arm-friendly");
assert.equal(mod.armFriendlyOf({ ra: CUT + 1 }), false, "RA one above the cutoff is not");
assert.equal(mod.armFriendlyOf({ ra: CUT + 8, armFriendlyOverride: true }), true, "override wins over RA");
assert.equal(mod.armFriendlyOf({ ra: CUT - 8, armFriendlyOverride: false }), false, "override wins in both directions");

// every real row agrees with its own RA unless it declares an override
for (const r of mod.RACQUET_DB) {
  assert.ok(typeof r.ra === "number", `${r.model} has no ra — it would fall back to BlankRA_Default and read as arm-friendly`);
  if (r.armFriendlyOverride === undefined)
    assert.equal(mod.armFriendlyOf(r), r.ra <= CUT, `${r.model}: derived value disagrees with its RA`);
}

const n = mod.RACQUET_DB.filter((r) => mod.armFriendlyOf(r)).length;
console.log(`armFriendly guard: ${mod.RACQUET_DB.length} rows, none hand-set, ${rowOverrides.length} commented override(s), ${n} arm-friendly ✓`);

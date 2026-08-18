// Blank-swingWeight guard — both scoring paths must produce finite subscores
// for a frame with no swingWeight (computeSubscores always did via
// SETTINGS.BlankSW_Default; performanceSubscores read it bare until Aug 2026,
// which would have NaN'd the DOMINANT path the first time a frame shipped
// without a value). The 1008-grid diff can never catch this because every
// current DB frame has a swingWeight. Run: npm run test:blanksw
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const ROOT = new URL("..", import.meta.url).pathname;
const src = readFileSync(`${ROOT}src/PerfectRacket.jsx`, "utf8");
const ENTRY = `${ROOT}.blanksw-entry.jsx`, OUT = `${ROOT}.blanksw-bundle.mjs`;
writeFileSync(ENTRY, src + "\nexport { computeSubscores, performanceSubscores };\n");
execSync(`npx esbuild ${ENTRY} --bundle --loader:.jsx=jsx --jsx=automatic --format=esm --outfile=${OUT} --external:react --external:react-dom --external:react/jsx-runtime --log-level=error`, { cwd: ROOT, stdio: "inherit" });
const mod = await import(pathToFileURL(OUT).href + "?t=" + Date.now());
rmSync(ENTRY); rmSync(OUT);

// a plausible frame with swingWeight deliberately absent
const frame = { brand: "Test", model: "Blank SW", headSize: 100, weight: 300, balance: 5,
  mains: 16, crosses: 19, beamWidth: 23, ra: 63, length: 27.0, price: 259, armFriendly: true };
const d = { ntrp: "3.5", swingSpeed: "Moderate", priorityFocus: "Balanced", playStyle: "Baseliner",
  comfortVsPerf: "Balanced", painSeverity: "No issues", painLocations: [], stringType: "Not Sure" };

const finite = (obj, path) => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "number") assert.ok(Number.isFinite(v), `${path}.${k} is ${v} for blank-swingWeight frame`);
    else if (v && typeof v === "object") finite(v, `${path}.${k}`);
  }
};

finite(mod.performanceSubscores(frame, d), "performanceSubscores");
finite(mod.computeSubscores(frame, d, 0, 1.0), "computeSubscores");

// and the same frame WITH a swingWeight equal to the default must score
// identically on the performance path — proves the fallback is the default,
// not some other rescue
const withDefault = { ...frame, swingWeight: 315 };
assert.deepEqual(mod.performanceSubscores(frame, d), mod.performanceSubscores(withDefault, d),
  "blank swingWeight must score exactly as swingWeight 315 (BlankSW_Default)");

console.log("blank-sw guard: performance + arm-health paths both finite, fallback = BlankSW_Default (315) ✓");

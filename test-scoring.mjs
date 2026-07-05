// test-scoring.mjs — Perfect Racket scoring regression suite
// Replays a 1,008-profile synthetic grid (and optionally a real submissions CSV)
// through the CURRENT engines in src/PerfectRacket.jsx, writes a surfacing
// report, and diffs against the committed baseline.
//
// Usage (from repo root):
//   node test-scoring.mjs                        → run grid, compare vs scoring-baseline.json
//   node test-scoring.mjs --save-baseline        → snapshot current behavior as the new baseline
//   node test-scoring.mjs path/to/submissions.csv → also replay real submissions
//
// THE RULE: before changing ANY scoring weight, run this and save a baseline.
// After the change, run it again. Read every line of the diff. If you can't
// explain a shift, you don't understand your change yet. (Runbook: SCORING-RUNBOOK.md)

import { readFileSync, writeFileSync, existsSync, rmSync } from "fs";
import { execSync } from "child_process";

// ---- bundle the app and import the engine -----------------------------------
const TMP = "./.scoring-test-bundle.mjs";
const src = readFileSync("src/PerfectRacket.jsx", "utf8");
writeFileSync("./.scoring-test-entry.jsx", src + "\nexport { generateRecommendations };\n");
execSync(`npx esbuild ./.scoring-test-entry.jsx --bundle --loader:.jsx=jsx --jsx=automatic --format=esm --outfile=${TMP} --external:react --external:react-dom --external:react/jsx-runtime --log-level=error`, { stdio: "inherit" });
const { generateRecommendations: gen } = await import(TMP + "?t=" + Date.now());
rmSync("./.scoring-test-entry.jsx"); rmSync(TMP);

const i = src.indexOf("const RACQUET_DB = ["); const j = src.indexOf("\n];", i);
const DB = new Function(src.slice(i, j + 3) + "; return RACQUET_DB;")();
const W = Object.fromEntries(DB.map((f) => [f.model, f.weight]));

// ---- synthetic grid ----------------------------------------------------------
const NTRP = ["2.5", "3.0", "3.5", "4.0", "4.5", "5.0"];
const STYLE = ["Baseliner", "All-Court", "Doubles-First", "Serve & Volley"];
const SWING = ["Slow & Controlled", "Moderate", "Fast & Aggressive"];
const PRIO = ["Power", "Control", "Spin", "Maneuverability", "Balanced"];
const CVP = ["Comfort first", "Balanced", "Performance first"];
const PAIN = [["", "none"], ["Mild discomfort after playing", "mild"], ["Sharp pain during play", "severe"]];
const base = { name: "Sim", email: "s@x.com", ageRange: "26-35", playFrequency: "3-4x/wk",
  gripSize: "4⅜", currentRacket: "", budget: "No preference", goals: [], painLocations: [],
  painSeverity: "", pastInjuries: [], pastInjuryElbow: "No", pastInjuryShoulder: "No",
  pastInjuryWrist: "No", rehabStatus: "", stringType: "", tensionRange: "" };

const grid = [];
for (const ntrp of NTRP) for (const playStyle of STYLE) for (const swingSpeed of SWING) for (const priorityFocus of PRIO)
  grid.push({ ...base, mode: "performance", ntrp, playStyle, swingSpeed, priorityFocus, comfortVsPerf: "" });
for (const ntrp of NTRP) for (const playStyle of STYLE) for (const swingSpeed of SWING) for (const comfortVsPerf of CVP) for (const [painSeverity] of PAIN)
  grid.push({ ...base, mode: "armhealth", ntrp, playStyle, swingSpeed, comfortVsPerf, painSeverity,
    painLocations: painSeverity ? ["Elbow"] : [], priorityFocus: "" });

const key = (d) => [d.mode, d.ntrp, d.playStyle, d.swingSpeed, d.priorityFocus || d.comfortVsPerf, d.painSeverity ? (d.painSeverity.startsWith("Sharp") ? "sev" : "mild") : "none"].join("|");
const snapshot = {};
const count1 = {}, count3 = {};
let lowN = 0, lowSub285 = 0;
for (const d of grid) {
  const r = gen(d);
  const top = r.racquets.slice(0, 3).map((x) => x.model);
  snapshot[key(d)] = top;
  count1[top[0]] = (count1[top[0]] || 0) + 1;
  for (const m of top) count3[m] = (count3[m] || 0) + 1;
  if (parseFloat(d.ntrp) <= 3.0) { lowN++; if (W[top[0]] < 285) lowSub285++; }
}

console.log(`\n=== SYNTHETIC GRID (${grid.length} profiles) ===`);
console.log("#1 surfacing:");
Object.entries(count1).sort((a, b) => b[1] - a[1]).forEach(([m, c]) => console.log("  " + String(c).padStart(4), m));
const dead = DB.filter((f) => !count3[f.model]).map((f) => f.model);
console.log(`never in any top-3: ${dead.length}/42${dead.length ? " — " + dead.join(", ") : ""}`);
console.log(`NTRP≤3.0 sub-285g #1: ${lowSub285}/${lowN} (${(100 * lowSub285 / lowN).toFixed(0)}%)`);

// ---- optional: replay a real submissions CSV ---------------------------------
const csvPath = process.argv.find((a) => a.endsWith(".csv"));
if (csvPath && existsSync(csvPath)) {
  const parseCsv = (text) => {
    const rows = []; let row = [], cell = "", inQ = false;
    for (let k = 0; k < text.length; k++) { const c = text[k];
      if (inQ) { if (c === '"') { if (text[k + 1] === '"') { cell += '"'; k++; } else inQ = false; } else cell += c; }
      else if (c === '"') inQ = true; else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[k + 1] === "\n") k++; row.push(cell); cell = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
      else cell += c; }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    const h = rows.shift(); return rows.map((r) => Object.fromEntries(h.map((k, x) => [k, r[x] ?? ""])));
  };
  const rows = parseCsv(readFileSync(csvPath, "utf8")).filter((r) => /^[^\s@]+@[^\s@]+\./.test((r.email || "").trim()) && (r["top-racket"] || "").trim());
  const rc = {};
  let rSub = 0, rLow = 0, rLowSub = 0;
  for (const r of rows) {
    const d = { ...base, name: r.name, email: r.email, ntrp: r.ntrp, ageRange: r["age-range"], playFrequency: r["play-frequency"],
      playStyle: r["play-style"], swingSpeed: r["swing-speed"], mode: r.mode || "armhealth",
      priorityFocus: r["priority-focus"] || "", comfortVsPerf: r["comfort-vs-perf"] || "",
      painLocations: (r["pain-locations"] || "").split("; ").filter(Boolean), painSeverity: r["pain-severity"] || "",
      pastInjuryElbow: r["past-injury-elbow"] || "No", pastInjuryShoulder: r["past-injury-shoulder"] || "No",
      pastInjuryWrist: r["past-injury-wrist"] || "No", rehabStatus: r["rehab-status"] || "",
      stringType: r["string-type"] || "", tensionRange: r["tension-range"] || "",
      currentRacket: r["current-racket"] || "", budget: r.budget || "No preference", gripSize: r["grip-size"] || "" };
    let out; try { out = gen(d); } catch { continue; }
    const m1 = out.racquets[0].model;
    rc[m1] = (rc[m1] || 0) + 1;
    const w = W[m1]; const n = parseFloat(r.ntrp) || 3.5;
    if (w < 285) rSub++;
    if (n <= 3.0) { rLow++; if (w < 285) rLowSub++; }
  }
  console.log(`\n=== REAL REPLAY (${rows.length} submissions) ===`);
  Object.entries(rc).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([m, c]) => console.log("  " + String(c).padStart(4), m, `(${(100 * c / rows.length).toFixed(1)}%)`));
  console.log(`sub-285g #1: overall ${(100 * rSub / rows.length).toFixed(1)}% | NTRP≤3.0 ${(100 * rLowSub / Math.max(rLow, 1)).toFixed(1)}%`);
}

// ---- baseline compare ---------------------------------------------------------
const BASELINE = "scoring-baseline.json";
if (process.argv.includes("--save-baseline")) {
  writeFileSync(BASELINE, JSON.stringify(snapshot));
  console.log(`\nBASELINE SAVED (${Object.keys(snapshot).length} profiles) → ${BASELINE}`);
} else if (existsSync(BASELINE)) {
  const prev = JSON.parse(readFileSync(BASELINE, "utf8"));
  const changes = [];
  for (const k of Object.keys(snapshot)) {
    if (!prev[k]) continue;
    if (prev[k].join(">") !== snapshot[k].join(">")) changes.push({ k, was: prev[k], now: snapshot[k] });
  }
  console.log(`\n=== DIFF vs baseline: ${changes.length}/${Object.keys(snapshot).length} profiles changed ===`);
  const top1changes = changes.filter((c) => c.was[0] !== c.now[0]);
  console.log(`#1 changed in ${top1changes.length}; top-3 membership shifts in ${changes.length}`);
  for (const c of changes.slice(0, 40)) console.log(`  ${c.k}\n    was ${c.was.join(" > ")}\n    now ${c.now.join(" > ")}`);
  if (changes.length > 40) console.log(`  ... and ${changes.length - 40} more`);
  if (!changes.length) console.log("  no changes — behavior identical to baseline");
} else {
  console.log(`\n(no ${BASELINE} found — run with --save-baseline to create one before making changes)`);
}

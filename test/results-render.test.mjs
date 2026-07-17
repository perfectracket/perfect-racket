// Server-render the results screen with seeded state; assert the home wordmark
// renders above the identity card and is wired to go("landing") (non-destructive).
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(new URL("../package.json", import.meta.url));
const React = require("react");
const { renderToString } = require("react-dom/server");

const origUseState = React.useState;
let seeds = null;
React.useState = function (init) {
  if (seeds) {
    if (init === "landing" && "screen" in seeds) return origUseState(seeds.screen);
    if (init === null && "recs" in seeds) return origUseState(seeds.recs);
    if (init && typeof init === "object" && "status" in init && "report" in seeds) return origUseState(seeds.report);
    if (init && typeof init === "object" && init.mode === "" && "goals" in init && "d" in seeds) return origUseState(seeds.d);
  }
  return origUseState(init);
};

const ROOT = new URL("..", import.meta.url).pathname; // repo root (test/ lives one level down)
const src = readFileSync(`${ROOT}/src/PerfectRacket.jsx`, "utf8");
const ENTRY = `${ROOT}/.rr-entry.jsx`, OUT = `${ROOT}/.rr-bundle.mjs`;
writeFileSync(ENTRY, src + "\nexport { generateRecommendationsPerformance };\n");
execSync(`npx esbuild ${ENTRY} --bundle --loader:.jsx=jsx --jsx=automatic --format=esm --outfile=${OUT} --external:react --external:react-dom --external:react/jsx-runtime --log-level=error`, { cwd: ROOT, stdio: "inherit" });
const mod = await import(OUT + "?t=" + Date.now());
rmSync(ENTRY); rmSync(OUT);
const PerfectRacket = mod.default;

const baseD = { mode: "performance", name: "Sam Tester", email: "s@x.com", ageRange: "36-45", ntrp: "4.0",
  budget: "No preference", currentRacket: "", gripSize: "4⅜", playStyle: "All-Court", playFrequency: "3-4x/wk",
  swingSpeed: "Moderate", whatMatters: "", comfortVsPerf: "", priorityFocus: "Control", painLocations: [], painSeverity: "",
  pastInjuryElbow: "No", pastInjuryShoulder: "No", pastInjuryWrist: "No", pastInjuries: [], rehabStatus: "", stringType: "", tensionRange: "", goals: [] };
const recs = mod.generateRecommendationsPerformance(baseD);

const origErr = console.error;
console.error = (...a) => { if (String(a[0]).includes("useLayoutEffect")) return; origErr(...a); };
seeds = { screen: "results", recs, report: { status: "failed", url: "", text: "" }, d: baseD };
const html = renderToString(React.createElement(PerfectRacket)).replace(/<!-- -->/g, "");
seeds = null;
console.error = origErr;

import assert from "node:assert/strict";
let pass = 0; const t = (n, f) => { try { f(); pass++; console.log("  ok  " + n); } catch (e) { console.error("FAIL " + n + " :: " + e.message); process.exitCode = 1; } };

t("wordmark button present in results", () => assert.ok(html.includes('class="r-topnav"') && html.includes('class="r-logo"')));
t("wordmark reads Perfect + Racket(span)", () => assert.ok(/r-logo[^>]*>Perfect<span>Racket<\/span>/.test(html)));
t("wordmark is a button (in-app), not an <a href> (would reload/wipe)", () => {
  const seg = html.slice(html.indexOf('class="r-topnav"'), html.indexOf('class="r-topnav"') + 220);
  assert.ok(seg.includes("<button"), "should be a button"); assert.ok(!/r-topnav[\s\S]{0,180}<a /.test(html), "must not be an anchor");
});
t("wordmark sits ABOVE the identity card (DOM order)", () => assert.ok(html.indexOf('class="r-topnav"') < html.indexOf('class="rid-card"'), "nav element before card element"));
t("identity card + results still render (no regression)", () => assert.ok(html.includes("rid-card") && html.includes("Racquet Recommendations") && html.includes("Start Over")));

console.log(`\n${pass} checks passed${process.exitCode ? " — WITH FAILURES" : ", 0 failures"}`);

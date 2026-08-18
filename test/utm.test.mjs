// UTM capture guard — the three utm-* fields land in a CSV Tucker opens in a
// spreadsheet, and their values come straight off the URL, so they are
// attacker-controllable. This pins the sanitizer (no angle brackets, no
// leading formula character, 100-char cap) and the empty-not-"undefined"
// contract that keeps organic rows clean. Run: npm run test:utm
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const ROOT = new URL("..", import.meta.url).pathname;
const src = readFileSync(`${ROOT}src/PerfectRacket.jsx`, "utf8");
const ENTRY = `${ROOT}.utm-entry.jsx`, OUT = `${ROOT}.utm-bundle.mjs`;
writeFileSync(ENTRY, src + "\nexport { UTM_PARAMS };\n");
execSync(`npx esbuild ${ENTRY} --bundle --loader:.jsx=jsx --jsx=automatic --format=esm --outfile=${OUT} --external:react --external:react-dom --external:react/jsx-runtime --log-level=error`, { cwd: ROOT, stdio: "inherit" });

const load = async (search, tag) => {
  globalThis.window = { location: { search } };
  return (await import(pathToFileURL(OUT).href + "?c=" + tag)).UTM_PARAMS;
};
const vals = (p) => [p.source, p.medium, p.campaign];
let pass = 0;
const check = (name, cond) => { assert.ok(cond, name); console.log(`  ok  ${name}`); pass++; };

// a real paid row survives intact
const normal = await load("?utm_source=facebook&utm_medium=paid-social&utm_campaign=120249139006990764", "n");
check("real campaign values pass through unchanged",
  normal.source === "facebook" && normal.medium === "paid-social" && normal.campaign === "120249139006990764");

// organic rows submit empty strings, never the literal "undefined"/"null"
for (const [tag, search] of [["a", ""], ["e", "?utm_source=&utm_medium=&utm_campaign="]]) {
  const p = await load(search, tag);
  check(`no params (${tag}) yields empty strings, not "undefined"`,
    vals(p).every((v) => v === "" && typeof v === "string"));
}

// hostile URL input is defanged before it can reach a spreadsheet
const bad = await load(`?utm_source=<script>alert(1)</script>&utm_medium==HYPERLINK("evil")&utm_campaign=${"A".repeat(140)}`, "h");
check("angle brackets stripped", !/[<>]/.test(vals(bad).join("")));
check("leading formula character stripped (CSV injection)", !vals(bad).some((v) => /^[=+@-]/.test(v)));
check("values capped at 100 chars", vals(bad).every((v) => v.length <= 100));

// missing window must not throw at module load — it would take the whole app down
delete globalThis.window;
const none = (await import(pathToFileURL(OUT).href + "?c=w")).UTM_PARAMS;
check("no window object does not throw, fields still empty", vals(none).every((v) => v === ""));

rmSync(ENTRY); rmSync(OUT);
console.log(`\n${pass} checks passed, 0 failures`);

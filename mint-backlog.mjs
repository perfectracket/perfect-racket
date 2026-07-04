// mint-backlog.mjs — Perfect Racket backlog report mint
// Mints fitting cards for every clean, deduped lead in a Netlify submissions CSV
// by calling the LIVE /api/generate-report (so serials, dedupe, storage, and
// allowlists all behave exactly as production).
//
// Run from the project root (needs src/PerfectRacket.jsx for the racket DB):
//   MINT_KEY=your-admin-key node mint-backlog.mjs path/to/submissions.csv
//
// Options (env):
//   MINT_KEY      required — must match ADMIN_MINT_KEY in Netlify env vars
//   PR_ENDPOINT   default https://perfectracket.com/api/generate-report
//   DRY_RUN=1     parse + clean + report what WOULD be minted, no API calls
//
// Outputs (in ./mint-output/):
//   minted.json        progress file — safe to re-run, already-minted emails are skipped
//   kit-import.csv     email,report_url — bulk-import into Kit to fill report_url fields
//   qa-scan.md         red-flag scan of every generated report (read before broadcasting)
//   failures.csv       any leads that could not be minted, with reasons

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";

const CSV_PATH = process.argv[2];
if (!CSV_PATH) { console.error("Usage: MINT_KEY=... node mint-backlog.mjs <submissions.csv>"); process.exit(1); }
const MINT_KEY = process.env.MINT_KEY || "";
const ENDPOINT = process.env.PR_ENDPOINT || "https://perfectracket.com/api/generate-report";
const DRY = !!process.env.DRY_RUN;
if (!MINT_KEY && !DRY) { console.error("MINT_KEY env var required (must match Netlify ADMIN_MINT_KEY)"); process.exit(1); }

// ---------- 1. Extract the app's own DB + URL logic (single source of truth) ----------
const jsx = readFileSync("src/PerfectRacket.jsx", "utf8");
function slice(startMarker, endMarker) {
  const i = jsx.indexOf(startMarker);
  if (i === -1) throw new Error("marker not found: " + startMarker);
  const j = jsx.indexOf(endMarker, i);
  if (j === -1) throw new Error("end not found for: " + startMarker);
  return jsx.slice(i, j + endMarker.length);
}
const code = [
  slice("const TE_BASE", ";"),
  slice("const AFFILIATE_CODE", ";"),
  slice("const RACQUET_DB = [", "\n];"),
  slice("const RACQUET_AFFILIATE_URLS = {", "\n};"),
  slice("const STRING_AFFILIATE_URLS = {", "\n};"),
  slice("function buildShopUrl(", "\n}"),
  slice("function buildSearchShopUrl(", "\n}"),
  slice("function getRacquetShopUrl(", "\n}"),
  "return { RACQUET_DB, getRacquetShopUrl, buildSearchShopUrl };",
].join("\n");
const { RACQUET_DB, getRacquetShopUrl, buildSearchShopUrl } = new Function(code)();
console.log(`Extracted app logic: ${RACQUET_DB.length} frames in DB`);

function findFrame(name) {
  const n = (name || "").trim();
  if (!n) return null;
  let f = RACQUET_DB.find((r) => `${r.brand} ${r.model}` === n || r.model === n);
  if (!f) f = RACQUET_DB.find((r) => n.endsWith(r.model) || n.includes(r.model));
  return f || null;
}

// ---------- 2. CSV parsing (quote-aware, no deps) ----------
function parseCsv(text) {
  const rows = []; let row = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift();
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

// ---------- 3. Clean + dedupe (junk rules per the daily-brief methodology) ----------
function isJunk(r) {
  const e = (r.email || "").toLowerCase().trim();
  const n = (r.name || "").toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return "bad email";
  if (["test", "fake", "asdf", "example.", "mailinator", "sample", "qwerty", "noemail", "none@"].some((t) => e.includes(t))) return "junk email";
  if (["test", "asdf", "audit", "a", "x", "."].some((t) => n === t) || n.startsWith("audit ")) return "test name";
  if (!(r["top-racket"] || "").trim()) return "no recommendation stored";
  return null;
}

const raw = parseCsv(readFileSync(CSV_PATH, "utf8"));
console.log(`CSV rows: ${raw.length}`);
const rejected = [];
const byEmail = new Map(); // keep the LATEST submission per email (most recent profile wins)
for (const r of raw) {
  const why = isJunk(r);
  if (why) { rejected.push({ email: r.email, why }); continue; }
  const e = r.email.toLowerCase().trim();
  const prev = byEmail.get(e);
  if (!prev || (r.created_at || "") > (prev.created_at || "")) byEmail.set(e, r);
}
const leads = [...byEmail.values()];
console.log(`Clean unique leads to mint: ${leads.length} (rejected ${rejected.length})`);

// ---------- 4. Payload builder (mirrors the JSX exactly) ----------
function buildPayload(r) {
  const spec = (name) => {
    const f = findFrame(name);
    if (!f) return name ? { model: name.trim(), url: buildSearchShopUrl(name.trim()) } : null; // historical frame not in current DB: name + discount search link (same fallback the live app uses)
    return {
      model: `${f.brand} ${f.model}`, headSize: f.headSize, weight: f.weight,
      swingWeight: f.swingWeight, ra: f.ra, pattern: `${f.mains}x${f.crosses}`,
      price: f.price, url: getRacquetShopUrl(f),
    };
  };
  const injuries = [
    r["past-injury-elbow"] === "Yes" ? "elbow" : "",
    r["past-injury-shoulder"] === "Yes" ? "shoulder" : "",
    r["past-injury-wrist"] === "Yes" ? "wrist" : "",
  ].filter(Boolean).join(", ");
  return {
    website: "",
    name: r.name || "", email: r.email.trim(),
    ntrp: r.ntrp || "", ageRange: r["age-range"] || "",
    playFrequency: r["play-frequency"] || "", playStyle: r["play-style"] || "",
    swingSpeed: r["swing-speed"] || "", mode: r.mode || "armhealth",
    priorityFocus: r["priority-focus"] || "", comfortVsPerf: r["comfort-vs-perf"] || "",
    painLocations: r["pain-locations"] || "", painSeverity: r["pain-severity"] || "",
    pastInjuries: injuries, currentRacket: r["current-racket"] || "",
    stringType: r["string-type"] || "", gripSize: r["grip-size"] || "",
    budget: r.budget || "",
    rank1: spec(r["top-racket"]), rank2: spec(r["racket-2"]), rank3: spec(r["racket-3"]),
    string1: r["top-string"] || "", string2: r["string-2"] || "", string3: r["string-3"] || "",
    tensionRange: r.tension || "", tensionStart: r["tension-recommended"] || "",
  };
}

// ---------- 5. Mint loop (sequential, resumable, retrying) ----------
mkdirSync("mint-output", { recursive: true });
const PROGRESS = "mint-output/minted.json";
const minted = existsSync(PROGRESS) ? JSON.parse(readFileSync(PROGRESS, "utf8")) : {};
const failures = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mintOne(payload) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-mint-key": MINT_KEY },
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return { error: `rejected ${res.status}: ${(await res.text()).slice(0, 120)}` };
      }
      // 429/5xx: back off and retry
      await sleep(1500 * attempt);
    } catch (e) {
      await sleep(1500 * attempt);
    }
  }
  return { error: "failed after 3 attempts" };
}

const todo = leads.filter((r) => !minted[r.email.toLowerCase().trim()]);
console.log(`Already minted (resume): ${leads.length - todo.length} | To mint now: ${todo.length}`);
if (DRY) {
  const noFrame = todo.filter((r) => !findFrame(r["top-racket"]));
  console.log(`DRY RUN — no API calls. Frames not matched in DB (will mint name-only, no shop link): ${noFrame.length}`);
  noFrame.slice(0, 15).forEach((r) => console.log("  unmatched:", r["top-racket"]));
  process.exit(0);
}

let done = 0;
for (const r of todo) {
  const email = r.email.toLowerCase().trim();
  const out = await mintOne(buildPayload(r));
  if (out && out.url) {
    minted[email] = { id: out.id, url: out.url, text: out.text || "", racket: r["top-racket"], first: (r.name || "").split(/\s+/)[0] };
    writeFileSync(PROGRESS, JSON.stringify(minted, null, 1));
  } else {
    failures.push({ email, why: (out && out.error) || "unknown" });
  }
  done++;
  if (done % 25 === 0 || done === todo.length) console.log(`  ${done}/${todo.length} (${failures.length} failures)`);
  await sleep(350);
}

// ---------- 6. Outputs ----------
const csvEsc = (v) => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
writeFileSync("mint-output/kit-import.csv",
  "email,report_url\n" + Object.entries(minted).map(([e, m]) => `${csvEsc(e)},${csvEsc(m.url)}`).join("\n"));
writeFileSync("mint-output/failures.csv",
  "email,reason\n" + failures.concat(rejected.map((x) => ({ email: x.email, why: x.why })))
    .map((f) => `${csvEsc(f.email || "")},${csvEsc(f.why)}`).join("\n"));

// ---------- 7. QA scan (mechanism-claim red flags per the July 3 red-team) ----------
const flags = [];
const checks = [
  [/light(er)?[^.]{0,60}(easier|safer|gentler|kinder)[^.]{0,30}(arm|elbow)/i, "lighter=safer-arm claim"],
  [/(guarantee|cure|heal|diagnos|treatment for)/i, "medical/absolute language"],
  [/https?:\/\//i, "URL leaked into report"],
  [/grip size/i, "grip size mentioned oddly"],
];
for (const [email, m] of Object.entries(minted)) {
  if (!m.text) continue;
  const wc = (m.text.match(/\S+/g) || []).length;
  if (wc < 160 || wc > 450) flags.push({ email, flag: `word count ${wc}` });
  if (!m.text.includes("Tucker, Perfect Racket")) flags.push({ email, flag: "missing sign-off" });
  for (const [re, label] of checks) {
    const hit = m.text.match(re);
    if (hit) flags.push({ email, flag: label, excerpt: hit[0].slice(0, 90) });
  }
}
writeFileSync("mint-output/qa-scan.md",
  `# Backlog QA scan — ${new Date().toISOString().slice(0, 10)}\n\n` +
  `Minted: ${Object.keys(minted).length} · Failures: ${failures.length} · Flags: ${flags.length}\n\n` +
  (flags.length ? flags.map((f) => `- **${f.email}** — ${f.flag}${f.excerpt ? ` — "…${f.excerpt}…"` : ""}`).join("\n")
    : "No red flags found. Spot-read 20 reports anyway before broadcasting.") + "\n");

console.log(`\nDONE. Minted total: ${Object.keys(minted).length} | Failures: ${failures.length} | QA flags: ${flags.length}`);
console.log("Outputs: mint-output/kit-import.csv, qa-scan.md, failures.csv");
console.log("Next: review qa-scan.md, spot-read ~20 report URLs, then import kit-import.csv into Kit (map column → report_url).");

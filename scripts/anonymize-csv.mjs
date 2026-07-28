// scripts/anonymize-csv.mjs — strip personal data from a Netlify submissions
// export BEFORE it leaves this machine (e.g. before uploading to an AI tool
// for analysis).
//
//   node scripts/anonymize-csv.mjs ~/Downloads/perfect-racket-submission-28.csv
//   → writes  perfect-racket-submission-28.anon.csv  next to the original
//
// WHAT IT DOES
//   REMOVED  name, ip, user_agent            (directly identifying)
//   HASHED   email → 8-char stable hash      (dedupe + repeat-user analysis
//                                             still work; the address is gone)
//   FLAGGED  report-url → "yes" / ""         (blank-report-rate analysis still
//                                             works; the link — which opens a
//                                             page showing the player's first
//                                             name — is gone)
//   KEPT     every answer, recommendation, tension, scoring-version, timestamp
//
// The hash is salted per-file-set with a fixed project salt so the same email
// maps to the same hash across exports (retakes stay linkable) but the hashes
// are not reversible to an address by anyone who only has the output.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, join } from "node:path";

const SALT = "perfect-racket-anon-v1"; // keep constant so hashes are stable across exports
const DROP = new Set(["name", "ip", "user_agent"]);
const HASH = new Set(["email"]);
const FLAG = new Set(["report-url"]);

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/anonymize-csv.mjs <submissions.csv>");
  process.exit(1);
}

// -- CSV parse (same quoting rules as test-scoring.mjs) ------------------------
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
  return rows;
}
const esc = (v) => /[",\n\r]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
const shortHash = (v) => createHash("sha256").update(SALT + String(v).trim().toLowerCase()).digest("hex").slice(0, 8);

const rows = parseCsv(readFileSync(src, "utf8"));
if (!rows.length) { console.error("empty file"); process.exit(1); }

const header = rows.shift();
const keepIdx = header.map((h, i) => (DROP.has(h) ? -1 : i)).filter((i) => i !== -1);
const outHeader = keepIdx.map((i) => (HASH.has(header[i]) ? header[i] + "_hash" : header[i]));

const out = [outHeader.map(esc).join(",")];
for (const r of rows) {
  const cells = keepIdx.map((i) => {
    const name = header[i], v = r[i] ?? "";
    if (HASH.has(name)) return v.trim() ? shortHash(v) : "";
    if (FLAG.has(name)) return v.trim() ? "yes" : "";
    return v;
  });
  out.push(cells.map(esc).join(","));
}

const dest = join(dirname(src), basename(src).replace(/\.csv$/i, "") + ".anon.csv");
writeFileSync(dest, out.join("\n") + "\n");

console.log(`anonymized ${rows.length} rows`);
console.log(`  removed : ${[...DROP].join(", ")}`);
console.log(`  hashed  : ${[...HASH].join(", ")}  (stable across exports)`);
console.log(`  flagged : ${[...FLAG].join(", ")}  (yes/blank)`);
console.log(`  kept    : ${outHeader.length} columns`);
console.log(`→ ${dest}`);

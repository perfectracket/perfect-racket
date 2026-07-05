// netlify/functions/report-view.mjs — v3 "reference document" layout
// Perfect Racket fitting report at /report/{id}: identity card header, setup at
// a glance, full top-3 frames (each with its own allowlisted shop link),
// top-3 strings, readable fitting notes, stringer script, primary CTA.
// Typography sized for a 36-55 core audience. Alternating navy/cream rhythm.
// All interpolations escaped; noindex; og tags for link unfurls.
// Backward compat: v2 records (no ranks[]) render without the frames/strings
// sections; v1 records (no card fields) fall back to prose-only.

import { getStore } from "@netlify/blobs";

export const config = { path: "/report/:id" };

const SHOP_URL_PREFIX = "https://www.tennisexpress.com";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const heading = (eyebrow, title) =>
  `<div class="sec-head"><div class="sec-eyebrow">${eyebrow}</div><h2 class="sec-title">${title}</h2><div class="sec-rule"></div></div>`;

const shell = (headExtra, bodyHtml, status = 200) =>
  new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex, nofollow"/>
${headExtra}
<link rel="icon" href="/favicon.ico" sizes="any"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Outfit:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<script defer data-domain="perfectracket.com" src="https://plausible.io/js/script.outbound-links.tagged-events.js"></script>
<style>
:root{--navy:#0D1B2A;--navy2:#13233a;--cream:#FAF7F2;--clay:#C8522A;--clay-b:#E06A3E;--gold:#C49A3C;--arm:#4E9B77;--mid:#5c5c5c;--line:rgba(13,27,42,.12);--wline:rgba(255,255,255,.12)}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--cream);color:var(--navy);font-family:'Outfit',sans-serif;font-weight:300;line-height:1.7;-webkit-font-smoothing:antialiased}
body::after{content:"";position:fixed;inset:0;pointer-events:none;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E")}
.wrap{max-width:640px;margin:0 auto;padding:32px 18px 90px}
.nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
.logo{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:26px;color:var(--navy);text-decoration:none}
.logo span{color:var(--clay)}
/* --- identity card --- */
.card{position:relative;background:linear-gradient(168deg,var(--navy) 0%,var(--navy2) 100%);color:var(--cream);border-radius:20px;padding:28px 24px;overflow:hidden;box-shadow:0 22px 55px rgba(13,27,42,.28)}
.card::before{content:"";position:absolute;inset:8px;border:1px solid rgba(196,154,60,.4);border-radius:14px;pointer-events:none}
.card::after{content:"PR";position:absolute;right:-22px;bottom:-58px;font-family:'Cormorant Garamond',serif;font-weight:700;font-size:200px;color:rgba(255,255,255,.035);line-height:1;pointer-events:none}
.c-eyebrow{display:flex;justify-content:space-between;align-items:center;font-family:'DM Mono',monospace;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-bottom:14px}
.c-eyebrow b{color:var(--gold);font-weight:500}
.c-name{font-family:'Cormorant Garamond',serif;font-weight:700;font-size:38px;line-height:1.02;letter-spacing:-.01em}
.c-typerow{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:14px}
.chip{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.7);border:1px solid var(--wline);border-radius:20px;padding:6px 11px}
.chip.mode-arm{color:#9FDCBE;border-color:rgba(143,211,182,.5);background:rgba(78,155,119,.14)}
.chip.mode-perf{color:var(--clay-b);border-color:rgba(224,106,62,.55);background:rgba(200,82,42,.14)}
/* --- setup at a glance --- */
.glance{background:#fff;border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:14px;padding:20px;margin:16px 0 34px;box-shadow:0 8px 28px rgba(13,27,42,.07)}
.glance .g-lbl{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--clay);margin-bottom:12px}
.g-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(min-width:520px){.g-grid{grid-template-columns:repeat(4,1fr)}}
.g-item .l{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--mid)}
.g-item .v{font-weight:600;font-size:15.5px;margin-top:4px;line-height:1.35}
/* --- section headings --- */
.sec-head{margin:38px 0 18px}
.sec-eyebrow{font-family:'DM Mono',monospace;font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--clay);margin-bottom:6px}
.sec-title{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:29px;line-height:1.1;color:var(--navy)}
.sec-rule{width:52px;height:3px;background:var(--gold);margin-top:10px}
.navyband .sec-eyebrow{color:var(--gold)}
.navyband .sec-title{color:var(--cream)}
/* --- frame cards --- */
.fcard{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;margin-bottom:12px;box-shadow:0 4px 18px rgba(13,27,42,.05)}
.fcard.top{border:1px solid rgba(196,154,60,.6);box-shadow:0 10px 34px rgba(196,154,60,.16)}
.f-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.rank{flex-shrink:0;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:12px;font-weight:500;background:rgba(13,27,42,.06);color:var(--mid)}
.fcard.top .rank{background:var(--gold);color:#fff}
.f-name{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:24px;line-height:1.12;flex:1}
.f-price{font-family:'DM Mono',monospace;font-size:13px;color:var(--mid);flex-shrink:0;padding-top:5px}
.f-specs{font-family:'DM Mono',monospace;font-size:11.5px;letter-spacing:.04em;color:var(--mid);margin:10px 0 14px;line-height:1.8}
.f-shop{display:block;text-align:center;font-weight:600;font-size:14.5px;padding:12px;border-radius:10px;text-decoration:none;border:1.5px solid var(--clay);color:var(--clay);transition:background .15s,color .15s}
.f-shop:hover{background:var(--clay);color:#fff}
.fcard.top .f-shop{background:var(--clay);color:#fff;box-shadow:0 6px 20px rgba(200,82,42,.3)}
/* --- strings navy band --- */
.navyband{background:linear-gradient(168deg,var(--navy) 0%,var(--navy2) 100%);color:var(--cream);border-radius:18px;padding:6px 22px 24px;margin-top:34px}
.navyband .sec-head{margin-top:26px}
.s-row{display:flex;align-items:center;gap:14px;padding:13px 0;border-bottom:1px solid var(--wline)}
.s-row:last-child{border-bottom:none}
.s-rank{flex-shrink:0;font-family:'DM Mono',monospace;font-size:11px;color:var(--gold)}
.s-name{font-weight:500;font-size:16px}
.s-note{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;color:rgba(255,255,255,.45);margin-left:auto;text-transform:uppercase}
.tension-line{margin-top:16px;padding:14px;border:1px dashed rgba(196,154,60,.5);border-radius:10px;font-size:15px;color:rgba(255,255,255,.85)}
.tension-line b{color:var(--gold);font-weight:600}
/* --- notes --- */
.notes p{font-size:17.5px;line-height:1.75;color:var(--navy);margin-bottom:18px}
.notes p:last-child{font-family:'DM Mono',monospace;font-size:13px;letter-spacing:.05em;color:var(--mid);margin-bottom:0}
/* --- script --- */
.script{background:linear-gradient(168deg,var(--navy) 0%,var(--navy2) 100%);color:var(--cream);border-radius:16px;padding:22px;margin-top:8px}
.script .s-lbl{font-family:'DM Mono',monospace;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:10px}
.script .txt{font-family:'DM Mono',monospace;font-size:14px;line-height:1.75;color:rgba(255,255,255,.9)}
.script button{margin-top:14px;width:100%;font-family:'DM Mono',monospace;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;padding:13px;border-radius:10px;border:1px solid rgba(196,154,60,.5);background:transparent;color:var(--gold);cursor:pointer}
.script button:hover{background:var(--gold);color:var(--navy)}
/* --- actions & cta --- */
.actions{display:flex;gap:10px;margin-top:16px}
.btn{flex:1;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.13em;text-transform:uppercase;text-align:center;padding:13px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--navy);cursor:pointer;text-decoration:none}
.btn:hover{border-color:var(--clay);color:var(--clay)}
.cta{margin-top:44px;text-align:center;background:var(--clay);border-radius:18px;padding:30px 22px;box-shadow:0 14px 40px rgba(200,82,42,.3)}
.cta .t{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:26px;color:#fff;line-height:1.15}
.cta p{font-size:15px;color:rgba(255,255,255,.85);margin:8px 0 16px}
.cta a{display:inline-block;background:#fff;color:var(--clay);font-weight:600;font-size:15px;padding:13px 26px;border-radius:11px;text-decoration:none}
.foot{margin-top:42px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(13,27,42,.4);text-align:center}
</style>
</head>
<body>
<div class="wrap">
<nav class="nav"><a class="logo" href="/">Perfect<span>Racket</span></a></nav>
${bodyHtml}
<div class="foot">© 2026 Perfect Racket</div>
</div>
</body>
</html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow", "cache-control": "public, max-age=300" } }
  );

const notFound = () =>
  shell(`<title>Report not found | Perfect Racket</title>`,
    `${heading("Fitting Report", "Report not found")}
<div class="notes"><p>This report may still be generating, or the link may be incorrect. If you just finished the quiz, wait a few seconds and refresh.</p></div>
<div class="cta"><div class="t">Want a fitting of your own?</div><p>It takes three minutes.</p><a href="/">Get your fitting</a></div>`, 404);

export default async (req) => {
  const id = new URL(req.url).pathname.split("/").filter(Boolean).pop() || "";
  if (!/^[A-Za-z0-9_-]{10,32}$/.test(id)) return notFound();

  let rec = null;
  try { rec = await getStore("reports").get(id, { type: "json" }); } catch { /* not found */ }
  if (!rec || !rec.text) return notFound();

  const first = rec.first && rec.first.length > 1 ? rec.first : "";
  const dateStr = new Date(rec.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const paragraphs = String(rec.text).split(/\n{2,}|\n(?=—)/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`).join("\n");

  const ogTitle = `${first ? esc(first) + "'s" : "A"} Perfect Racket Fitting`;
  const ogDesc = `Personal racket fitting: ${esc(rec.topRacket || "a matched setup")}${rec.string1 ? " with " + esc(rec.string1) : ""}${rec.tensionStart ? " at " + esc(rec.tensionStart) + " lbs" : ""}. Three minutes to yours.`;
  const headExtra = `<title>${ogTitle} | Perfect Racket</title>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Perfect Racket"/>
<meta property="og:title" content="${ogTitle}"/>
<meta property="og:description" content="${ogDesc}"/>
<meta property="og:image" content="https://perfectracket.com/og-image.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${ogTitle}"/>
<meta name="twitter:description" content="${ogDesc}"/>`;

  // ---- v1 legacy: prose only ----
  if (!rec.mode && !rec.ranks) {
    return shell(headExtra,
      `${heading("Personal Fitting Report", esc(rec.topRacket || "Your Setup"))}
<div class="notes"><p style="font-family:'DM Mono',monospace;font-size:12px;color:var(--mid)">${first ? "Prepared for " + esc(first) + " · " : "Prepared "}${esc(dateStr)}</p>${paragraphs}</div>
<div class="actions"><button class="btn" id="copy">Copy link</button><a class="btn" href="/">Retake the fitting</a></div>
<div class="cta"><div class="t">Know someone hunting for their racket?</div><p>Send them here.</p><a href="/">Get your own fitting</a></div>
<script>document.getElementById("copy").addEventListener("click",function(){navigator.clipboard.writeText(window.location.href).then(function(){var b=document.getElementById("copy");b.textContent="Copied";setTimeout(function(){b.textContent="Copy link"},2000)})});</script>`);
  }

  const modeArm = rec.mode === "armhealth";

  // identity card
  const cardHtml = `<div class="card">
<div class="c-eyebrow"><span>Personal Fitting</span><b>${rec.serial ? "Nº " + esc(String(rec.serial)) : ""}</b></div>
<div class="c-name">${first ? esc(first) + "&#8217;s Fitting" : "Your Fitting"}</div>
<div class="c-typerow">
${rec.ntrp ? `<span class="chip">NTRP ${esc(rec.ntrp)}</span>` : ""}
${rec.playStyle ? `<span class="chip">${esc(rec.playStyle)}</span>` : ""}
<span class="chip ${modeArm ? "mode-arm" : "mode-perf"}">${modeArm ? "Arm Health Fit" : "Performance Fit"}</span>
<span class="chip">${esc(dateStr)}</span>
</div>
</div>`;

  // setup at a glance
  const glance = `<div class="glance"><div class="g-lbl">Your Setup at a Glance</div><div class="g-grid">
<div class="g-item"><div class="l">Racket</div><div class="v">${esc(rec.topRacket || "—")}</div></div>
<div class="g-item"><div class="l">String</div><div class="v">${esc(rec.string1 || "—")}</div></div>
<div class="g-item"><div class="l">Tension</div><div class="v">${esc(rec.tensionRange || "—")}</div></div>
<div class="g-item"><div class="l">Start at</div><div class="v">${rec.tensionStart ? esc(rec.tensionStart) + " lbs" : "—"}</div></div>
</div></div>`;

  // top frames (v3 records)
  let framesHtml = "";
  if (Array.isArray(rec.ranks) && rec.ranks.length) {
    const cards = rec.ranks.map((r, i) => {
      const specs = [
        r.headSize ? `${r.headSize} in²` : null, r.weight ? `${r.weight}g` : null,
        r.swingWeight ? `SW ${r.swingWeight}` : null, r.ra ? `RA ${r.ra}` : null,
        r.pattern ? esc(r.pattern) : null,
      ].filter(Boolean).join(" · ");
      const shopOk = typeof r.shopUrl === "string" && r.shopUrl.startsWith(SHOP_URL_PREFIX);
      return `<div class="fcard${i === 0 ? " top" : ""}">
<div class="f-row"><div class="rank">Nº${i + 1}</div><div class="f-name">${esc(r.model)}</div>${r.price ? `<div class="f-price">$${r.price}</div>` : ""}</div>
${specs ? `<div class="f-specs">${specs}</div>` : ""}
${shopOk ? `<a class="f-shop" href="${esc(r.shopUrl)}" rel="noopener">${i === 0 ? "Shop your best match" : "Shop this frame"}</a>` : ""}
</div>`;
    }).join("\n");
    framesHtml = `${heading("The Frames", "Your Top " + rec.ranks.length)}\n${cards}`;
  }

  // strings navy band (v3 records)
  let stringsHtml = "";
  if (Array.isArray(rec.strings) && rec.strings.length) {
    const rows = rec.strings.map((name, i) =>
      `<div class="s-row"><span class="s-rank">Nº${i + 1}</span><span class="s-name">${esc(name)}</span>${i === 0 ? '<span class="s-note">The Pick</span>' : ""}</div>`).join("\n");
    const tension = rec.tensionRange ? `<div class="tension-line">String at <b>${esc(rec.tensionRange)}</b>${rec.tensionStart ? ` — start at <b>${esc(rec.tensionStart)} lbs</b> and adjust from there.` : "."}</div>` : "";
    stringsHtml = `<div class="navyband">${heading("The Strings", "Your Top " + rec.strings.length)}\n${rows}\n${tension}</div>`;
  }

  const scriptBlock = rec.stringerScript ? `
<div class="script"><div class="s-lbl">Your Stringer Script — read it at the counter</div>
<div class="txt" id="stxt">${esc(rec.stringerScript)}</div>
<button id="scopy">Copy script</button></div>` : "";

  return shell(headExtra,
    `${cardHtml}
${glance}
${framesHtml}
${stringsHtml}
${heading("The Analysis", "The Fitting Notes")}
<div class="notes">${paragraphs}</div>
${heading("At the Shop", "Getting It Strung")}
${scriptBlock}
<div class="actions"><button class="btn" id="copy">Copy report link</button><a class="btn" href="/">Retake the fitting</a></div>
<div class="cta"><div class="t">Know someone hunting for their racket?</div><p>Send them this report — or send them to the fitting.</p><a href="/">Get your own fitting</a></div>
<script>
document.getElementById("copy").addEventListener("click",function(){navigator.clipboard.writeText(window.location.href).then(function(){var b=document.getElementById("copy");b.textContent="Copied";setTimeout(function(){b.textContent="Copy report link"},2000)})});
var sc=document.getElementById("scopy");
if(sc){sc.addEventListener("click",function(){navigator.clipboard.writeText(document.getElementById("stxt").textContent).then(function(){sc.textContent="Copied — read it at the counter";setTimeout(function(){sc.textContent="Copy script"},2200)})});}
</script>`);
};

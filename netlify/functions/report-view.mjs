// netlify/functions/report-view.mjs
// Perfect Racket — serves stored fitting reports at /report/{id}.
// All interpolated values are HTML-escaped (XSS-safe rendering per spec).
// Pages are noindexed (meta + header) and IDs are unguessable nanoids.

import { getStore } from "@netlify/blobs";

export const config = { path: "/report/:id" };

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const page = (title, bodyHtml, status = 200) =>
  new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex, nofollow"/>
<title>${esc(title)}</title>
<link rel="icon" href="/favicon.ico" sizes="any"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,600&family=Outfit:wght@300;400;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<script defer data-domain="perfectracket.com" src="https://plausible.io/js/script.js"></script>
<style>
:root{--navy:#0D1B2A;--cream:#FAF7F2;--clay:#C8522A;--gold:#C49A3C;--mid:#6b6b6b}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--cream);color:var(--navy);font-family:'Outfit',sans-serif;font-weight:300;line-height:1.7;-webkit-font-smoothing:antialiased}
.wrap{max-width:640px;margin:0 auto;padding:40px 22px 90px}
.nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:44px}
.logo{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:26px;color:var(--navy);text-decoration:none}
.logo span{color:var(--clay)}
.eyebrow{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--clay);margin-bottom:12px}
h1{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:38px;line-height:1.08;margin-bottom:8px}
.meta{font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.08em;color:var(--mid);margin-bottom:34px}
.report{background:#fff;border:1px solid rgba(13,27,42,.12);border-radius:16px;padding:30px 26px;box-shadow:0 6px 28px rgba(13,27,42,.06)}
.report p{font-size:16.5px;margin-bottom:16px}
.report p:last-child{margin-bottom:0;font-family:'DM Mono',monospace;font-size:12.5px;letter-spacing:.06em;color:var(--mid)}
.actions{display:flex;gap:10px;margin-top:22px}
.btn{flex:1;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.14em;text-transform:uppercase;text-align:center;padding:13px;border-radius:10px;border:1px solid rgba(13,27,42,.18);background:#fff;color:var(--navy);cursor:pointer;text-decoration:none;transition:border-color .15s,color .15s}
.btn:hover{border-color:var(--clay);color:var(--clay)}
.cta{margin-top:44px;text-align:center;border-top:1px solid rgba(13,27,42,.1);padding-top:32px}
.cta p{font-size:15px;color:var(--mid);margin-bottom:14px}
.cta a{display:inline-block;background:var(--clay);color:#fff;font-weight:600;font-size:15px;padding:14px 26px;border-radius:11px;text-decoration:none}
.foot{margin-top:46px;font-family:'DM Mono',monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(13,27,42,.4);text-align:center}
</style>
</head>
<body>
<div class="wrap">
<nav class="nav">
<a class="logo" href="/">Perfect<span>Racket</span></a>
</nav>
${bodyHtml}
<div class="foot">© 2026 Perfect Racket</div>
</div>
</body>
</html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "x-robots-tag": "noindex, nofollow",
        "cache-control": "public, max-age=300",
      },
    }
  );

export default async (req) => {
  const id = new URL(req.url).pathname.split("/").filter(Boolean).pop() || "";
  if (!/^[A-Za-z0-9_-]{10,32}$/.test(id)) {
    return page("Report not found | Perfect Racket",
      `<div class="eyebrow">Fitting Report</div>
<h1>Report not found</h1>
<div class="meta">This link doesn't match any report.</div>
<div class="cta"><p>Want a fitting of your own? It takes three minutes.</p><a href="/">Get your fitting</a></div>`, 404);
  }

  let rec = null;
  try {
    rec = await getStore("reports").get(id, { type: "json" });
  } catch { /* treated as not found */ }

  if (!rec || !rec.text) {
    return page("Report not found | Perfect Racket",
      `<div class="eyebrow">Fitting Report</div>
<h1>Report not found</h1>
<div class="meta">This report may still be generating, or the link may be incorrect. If you just finished the quiz, wait a few seconds and refresh.</div>
<div class="cta"><p>Want a fitting of your own? It takes three minutes.</p><a href="/">Get your fitting</a></div>`, 404);
  }

  const dateStr = new Date(rec.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const paragraphs = String(rec.text)
    .split(/\n{2,}|\n(?=—)/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("\n");

  const forLine = rec.first && rec.first.length > 1 ? `Prepared for ${esc(rec.first)} · ${esc(dateStr)}` : `Prepared ${esc(dateStr)}`;

  return page(`Your Fitting Report | Perfect Racket`,
    `<div class="eyebrow">Personal Fitting Report</div>
<h1>${esc(rec.topRacket || "Your Setup")}</h1>
<div class="meta">${forLine}</div>
<div class="report">
${paragraphs}
</div>
<div class="actions">
<button class="btn" id="copy">Copy link</button>
<a class="btn" href="/">Retake the fitting</a>
</div>
<div class="cta">
<p>Know someone hunting for their racket? Send them here.</p>
<a href="/">Get your own fitting</a>
</div>
<script>
document.getElementById("copy").addEventListener("click", function () {
  navigator.clipboard.writeText(window.location.href).then(function () {
    var b = document.getElementById("copy");
    b.textContent = "Copied";
    setTimeout(function () { b.textContent = "Copy link"; }, 2000);
  });
});
</script>`);
};

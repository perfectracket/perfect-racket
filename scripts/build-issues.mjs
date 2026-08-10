// scripts/build-issues.mjs - The Racket Report Monthly as static pages.
// Runs AFTER `vite build` (see package.json): reads content/newsletter/*.md,
// emits dist/newsletter/ (archive index + one page per issue + assets) and
// appends the newsletter URLs to dist/sitemap.xml. Never touches the SPA.
// Zero client JS on these pages. Adding an issue = drop a new md + images
// into content/newsletter/ and push (see content/newsletter/README.md).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content", "newsletter");
const DIST = join(ROOT, "dist");
const OUT = join(DIST, "newsletter");
const SITE = "https://perfectracket.com";

const NAV_NAME = "The Racket Report Monthly";
const TAGLINE = "One email a month from Perfect Racket. What's happening in the tennis gear world, one practical fix from the court, and the racquet of the month.";

// ---------- markdown (constrained subset; see README for the grammar) ----------
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(s) {
  s = escapeHtml(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return s;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error("missing frontmatter");
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: raw.slice(m[0].length) };
}

// The body becomes "cards": `## Title` starts a titled card, `---` an untitled
// one; everything before the first marker is the intro card.
function parseBody(body) {
  const cards = [{ title: null, blocks: [] }];
  for (const raw of body.split(/\n\s*\n/)) {
    const block = raw.trim();
    if (!block) continue;
    if (block.startsWith("## ")) { cards.push({ title: block.slice(3).trim(), blocks: [] }); continue; }
    if (/^-{3,}$/.test(block)) { cards.push({ title: null, blocks: [] }); continue; }
    cards[cards.length - 1].blocks.push(block);
  }
  return cards.filter((c) => c.title !== null || c.blocks.length);
}

function renderBlock(block) {
  const lines = block.split("\n").map((l) => l.trim());
  if (lines.every((l) => l.startsWith("- ")))
    return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join("")}</ul>`;
  if (lines[0].startsWith(">m "))
    return `<div class="callout callout-mono">${lines.map((l) => inline(l.replace(/^>m?\s?/, ""))).join(" ")}</div>`;
  if (lines[0].startsWith(">"))
    return `<div class="callout"><p>${lines.map((l) => inline(l.replace(/^>\s?/, ""))).join(" ")}</p></div>`;
  const img = lines[0].match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
  if (img) {
    const cap = lines[1] && /^\*[^*]+\*$/.test(lines[1]) ? `<figcaption>${inline(lines[1].slice(1, -1))}</figcaption>` : "";
    // lazy-load everything below the masthead; dimensions come from the asset table
    const dim = IMAGE_DIMS[img[2]] ? ` width="${IMAGE_DIMS[img[2]][0]}" height="${IMAGE_DIMS[img[2]][1]}"` : "";
    return `<figure><img src="/newsletter/assets/${img[2]}" alt="${escapeHtml(img[1])}"${dim} loading="lazy" decoding="async">${cap}</figure>`;
  }
  // a paragraph that is exactly one link renders as the mono CTA link
  if (/^\[[^\]]+\]\([^)\s]+\)$/.test(block)) return `<p class="cta-link">${inline(block)}</p>`;
  return `<p>${inline(block)}</p>`;
}

// Known asset dimensions so pages reserve layout space (no CLS). New images
// either get added here or ship without explicit dimensions (still fine).
const IMAGE_DIMS = {
  "masthead.png": [1040, 470],
  "issue-01-board.jpg": [1080, 1440],
  "issue-01-tension-chart.png": [1040, 666],
  "issue-01-racket-of-the-month.png": [1040, 451],
};

// ---------- shared page chrome ----------
const CSS = `
:root{--navy:#0D1B2A;--clay:#C8522A;--cream:#FAF7F2;--gold:#C49A3C;--ink:#3A3835;--soft:#6B6B6B}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--navy);color:var(--ink);font-family:'Outfit',-apple-system,sans-serif;font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased}
.top-rule{height:6px;background:var(--clay)}
.wrap{max-width:680px;margin:0 auto;padding:34px 16px 56px}
.issue-eyebrow{font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);text-align:center;margin-bottom:14px}
h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:clamp(28px,5.5vw,40px);line-height:1.18;color:var(--cream);text-align:center;margin-bottom:30px}
.card{background:var(--cream);border:2px solid var(--clay);border-radius:10px;padding:30px 26px;margin-bottom:22px;overflow:hidden}
.card.masthead-card{padding:0}
.card.masthead-card img{display:block;width:100%;height:auto}
.card h2{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-style:italic;font-size:30px;color:var(--navy);text-align:center;margin-bottom:18px}
.card p{margin-bottom:14px}
.card p:last-child,.card ul:last-child,.card figure:last-child,.card .callout:last-child{margin-bottom:0}
.card ul{margin:0 0 14px 22px}
.card li{margin-bottom:8px}
.card a{color:var(--navy);font-weight:600;text-decoration:underline;text-decoration-color:var(--gold);text-underline-offset:3px}
.callout{background:#F2EEE6;border-left:3px solid var(--gold);border-radius:0 6px 6px 0;padding:16px 18px;margin-bottom:14px}
.callout p{margin:0}
.callout-mono{font-family:'DM Mono',monospace;font-size:13px;line-height:1.75;color:#4A4742}
figure{margin:6px 0 16px}
figure img{display:block;width:100%;height:auto;border-radius:8px}
figcaption{font-size:13.5px;color:var(--soft);font-style:italic;text-align:center;margin-top:8px}
.cta-link{margin-top:6px}
.cta-link a{font-family:'DM Mono',monospace;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-weight:400;text-decoration:none;border-bottom:2px solid var(--gold);padding-bottom:3px}
.sig{font-family:'Cormorant Garamond',Georgia,serif;font-size:21px;color:var(--navy)}
.quiz-cta{background:var(--navy);border:2px solid var(--gold);border-radius:10px;padding:36px 28px;text-align:center;margin-bottom:22px}
.quiz-cta h2{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:29px;color:var(--cream);margin-bottom:12px}
.quiz-cta p{color:#C9C4BB;font-size:15.5px;max-width:46ch;margin:0 auto 20px}
.quiz-cta .btn{display:inline-block;background:var(--clay);color:#FFFFFF;font-weight:700;font-size:19px;text-decoration:none;padding:14px 32px;border-radius:6px}
.quiz-cta .fine{font-family:'DM Mono',monospace;font-size:11.5px;color:#8A94A3;margin:18px auto 0}
.issue-list{list-style:none;margin:0}
.issue-list li{padding:18px 0;border-bottom:1px solid #E5DFD4}
.issue-list li:last-child{border-bottom:none}
.issue-list a{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:23px;line-height:1.3;color:var(--navy);text-decoration:none}
.issue-list a:hover{text-decoration:underline;text-decoration-color:var(--gold)}
.issue-list .date{display:block;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:var(--soft);margin-top:6px}
.tagline{color:#C9C4BB;font-size:16px;text-align:center;max-width:52ch;margin:0 auto 30px}
footer{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.5px;line-height:2.1;color:#8A94A3;text-align:center}
footer a{color:#C9C4BB;text-decoration:underline}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:480px){.card{padding:24px 18px}.card h2{font-size:26px}}
`.trim();

const head = ({ title, description, canonical, ogImage, jsonld }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Perfect Racket">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0D1B2A">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Outfit:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
${jsonld ? `<script type="application/ld+json">${jsonld}</script>` : ""}
<style>${CSS}</style>
</head>
<body>
<div class="top-rule"></div>
<main class="wrap">`;

// The single CTA block: the quiz is the only door (standing decision, Aug 7).
// Copy is fixed by the build brief. No email field anywhere on these pages.
const QUIZ_CTA = `<div class="quiz-cta">
<h2>Find your racket. Get the report.</h2>
<p>Take the free fitting and get matched to the frames that actually fit your game, your level, and your arm. You'll also get The Racket Report Monthly, one email a month with what real players are playing, plus your personal fitting report.</p>
<a class="btn" href="/">Find your perfect racket</a>
<p class="fine">Free, takes about two minutes. One email a month, unsubscribe anytime.</p>
</div>`;

const footer = (isIssue) => `<footer>
PERFECT RACKET &middot; <a href="/">PERFECTRACKET.COM</a>${isIssue ? ` &middot; <a href="/newsletter/">ALL ISSUES</a>` : ""}<br>
Some links may earn Perfect Racket a commission. It never changes what the data recommends.<br>
<a href="/privacy.html">Privacy</a>
</footer>
</main>
</body>
</html>`;

// ---------- load issues ----------
const issues = readdirSync(CONTENT)
  .filter((f) => /^issue-\d+\.md$/.test(f)) // only issues; skips README.md etc.
  .map((f) => {
    const { meta, body } = parseFrontmatter(readFileSync(join(CONTENT, f), "utf8"));
    for (const k of ["issue", "title", "date", "description"]) if (!meta[k]) throw new Error(`${f}: missing ${k}`);
    const num = String(meta.issue).padStart(2, "0");
    return { ...meta, num, slug: `issue-${num}`, cards: parseBody(body) };
  })
  .sort((a, b) => Number(b.issue) - Number(a.issue)); // newest first

const longDate = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

// no em dashes anywhere on these pages, template or content (standing rule)
const emDashGuard = (html, where) => { if (html.includes("—")) throw new Error(`em dash found in ${where}`); return html; };

mkdirSync(join(OUT, "assets"), { recursive: true });
for (const f of readdirSync(join(CONTENT, "assets"))) copyFileSync(join(CONTENT, "assets", f), join(OUT, "assets", f));

// ---------- issue pages ----------
for (const it of issues) {
  const canonical = `${SITE}/newsletter/${it.slug}/`;
  const jsonld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: it.title,
    datePublished: it.date,
    image: `${SITE}/newsletter/assets/masthead.png`,
    author: { "@type": "Person", name: "Tucker", url: `${SITE}/` },
    publisher: { "@type": "Organization", name: "Perfect Racket", url: `${SITE}/` },
    mainEntityOfPage: canonical,
  });
  const cardsHtml = it.cards
    .map((c, i) => {
      let inner = (c.title ? `<h2>${inline(c.title)}</h2>` : "") + c.blocks.map(renderBlock).join("\n");
      // the closer card carries Tucker's sign-off styling on its last line
      if (i === it.cards.length - 1) inner = inner.replace(/<p>(See you next month[^<]*)<\/p>/, '<p class="sig">$1</p>');
      return `<article class="card">\n${inner}\n</article>`;
    })
    .join("\n");
  const html =
    head({ title: `${it.title} | ${NAV_NAME}`, description: it.description, canonical, ogImage: `${SITE}/newsletter/assets/masthead.png`, jsonld }) +
    `<p class="issue-eyebrow">Issue No. ${it.num} &middot; ${longDate(it.date)}</p>
<h1>${inline(it.title)}</h1>
<div class="card masthead-card"><img src="/newsletter/assets/masthead.png" alt="${NAV_NAME} by Perfect Racket" width="1040" height="470" fetchpriority="high"></div>
${cardsHtml}
${QUIZ_CTA}
` + footer(true);
  mkdirSync(join(OUT, it.slug), { recursive: true });
  writeFileSync(join(OUT, it.slug, "index.html"), emDashGuard(html, it.slug));
  console.log(`built /newsletter/${it.slug}/`);
}

// ---------- archive index ----------
{
  const canonical = `${SITE}/newsletter/`;
  const list = issues
    .map((it) => `<li><a href="/newsletter/${it.slug}/">${inline(it.title)}</a><span class="date">Issue No. ${it.num} &middot; ${longDate(it.date)}</span></li>`)
    .join("\n");
  const html =
    head({ title: `${NAV_NAME} | Perfect Racket`, description: TAGLINE, canonical, ogImage: `${SITE}/newsletter/assets/masthead.png`, jsonld: null }) +
    `<div class="card masthead-card"><img src="/newsletter/assets/masthead.png" alt="${NAV_NAME} by Perfect Racket" width="1040" height="470" fetchpriority="high"></div>
<h1 class="sr-only">${NAV_NAME}</h1>
<p class="tagline">${TAGLINE}</p>
<div class="card"><ul class="issue-list">
${list}
</ul></div>
${QUIZ_CTA}
` + footer(false);
  writeFileSync(join(OUT, "index.html"), emDashGuard(html, "index"));
  console.log(`built /newsletter/ (${issues.length} issue${issues.length === 1 ? "" : "s"})`);
}

// ---------- sitemap: append newsletter URLs to the copy vite placed in dist ----------
{
  const path = join(DIST, "sitemap.xml");
  let xml = readFileSync(path, "utf8");
  const entry = (loc, lastmod, freq, pri) =>
    `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>\n`;
  const newest = issues[0] ? issues[0].date : "2026-08-04";
  let add = "";
  if (!xml.includes(`${SITE}/newsletter/</loc>`)) add += entry(`${SITE}/newsletter/`, newest, "monthly", "0.8");
  for (const it of issues)
    if (!xml.includes(`${SITE}/newsletter/${it.slug}/</loc>`)) add += entry(`${SITE}/newsletter/${it.slug}/`, it.date, "yearly", "0.7");
  xml = xml.replace("</urlset>", add + "</urlset>");
  writeFileSync(path, xml);
  console.log(`sitemap: +${(add.match(/<url>/g) || []).length} newsletter URL(s)`);
}

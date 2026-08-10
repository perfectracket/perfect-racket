# Newsletter pages runbook (perfectracket.com/newsletter)

Each issue of The Racket Report Monthly lives as a static page on the PR
domain, built by `scripts/build-issues.mjs` during `npm run build` (it runs
right after `vite build` and writes into `dist/newsletter/`). The SPA is
untouched. Expected time per month: about 15 minutes.

## Adding an issue (monthly, after the Kit send)

1. Copy the newest md file (e.g. `issue-01.md` to `issue-02.md`) and replace
   the frontmatter and body with the SHIPPED issue's copy, verbatim. Source of
   truth is the Kit public post for that issue, not the pre-send draft.
   Two standing web edits every month:
   - time references like "this month" become the actual month, since the
     page is permanent
   - the personalized report block becomes the public-safe version (report
     arrived by email, doesn't expire, lost it = retake at perfectracket.com)
2. Drop that issue's images into `content/newsletter/assets/` with an
   `issue-NN-` prefix. The shared `masthead.png` (no issue line) is reused
   every month; the issue number and date render as text on the page.
   If you want zero layout shift, add each new image's pixel size to
   `IMAGE_DIMS` in `scripts/build-issues.mjs` (optional, pages work without).
3. Run `npm run build` locally and open `dist/newsletter/` to eyeball it,
   or just push. The Netlify build produces the pages and the sitemap
   entries automatically.

## Frontmatter fields (all required except subject)

```
issue: 2
title: <the issue's title>
date: 2026-09-01          (the Kit publish date, YYYY-MM-DD)
subject: <email subject line>
description: <meta description for search and social>
```

## Markdown the template understands

Plain paragraphs, `**bold**`, `*italic*`, `***bold italic***`,
`[text](url)`, `- ` bullet lists.

- `## Section Title` starts a new cream card with a centered serif title
  (This Month In Tennis, From The Court, Racquet Of The Month)
- `---` on its own line starts a new card with no title (the closer)
- `> text` renders as the gold-left-border callout (the report block)
- `>m text` renders the callout in mono (the WHAT IT MEANS FOR YOU line)
- `![alt](file.png)` renders an image from `assets/`; an `*italic*` line
  directly under it (no blank line) becomes the caption
- a paragraph that is ONLY a link renders as the mono uppercase CTA link
  (See the Boom MP)

## Standing rules

- Copy is the shipped issue, verbatim, except the two web edits above.
- No em dashes anywhere. The build FAILS if one appears, by design.
- Editorial law applies to any chrome text: players, never the machine.
- No email-capture form on these pages, ever. The quiz is the only door;
  the fixed CTA block at the bottom of every page is the one call to action.
- Affiliate links exactly as the issue shipped them, and the disclosure
  line stays in the footer.

## Fonts (only matters if the brand fonts ever change)

The pages inline vendored Google Fonts CSS from `scripts/newsletter-fonts.css`
instead of loading a render-blocking stylesheet (this is what keeps Lighthouse
performance at 100). If the font families or weights ever change, refetch:
curl the fonts.googleapis.com/css2 URL for the new families with a Chrome
User-Agent header and replace the file below the comment block.

## Kit duplicate-content choice (Tucker's call, once per issue)

The Kit public post for an issue duplicates these pages. Each PR page
declares itself canonical. Either unpublish the Kit public version once the
PR page is live (cleanest), or leave both and accept that Google picks one.
Kit offers no canonical tag, so there is nothing to set on Kit's side.

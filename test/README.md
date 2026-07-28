# Perfect Racket — verification harness

The repo's regression tests. **Run the relevant one before shipping any change to
the code it covers** — this is the project's non-negotiable verification culture
(see `docs-local/CLAUDE-CODE-BRIEF.md`). Throwing assertions only: silence = pass.

| Command | Covers | When to run |
|---|---|---|
| `npm run test:report` | `netlify/functions/generate-report.mjs` — mocked-API battery (retry on transient API errors, graceful off-length delivery, garbage rejection, failure/off-length counters, goals-wrapping, record shape, stripMarkdown, honeypot) | ANY change to generate-report.mjs |
| `npm run test:genfail` | `netlify/functions/genfail-stats.mjs` — admin read endpoint (auth fail-closed, per-day/reason breakdown, off-length section, no data leakage) | Any change to genfail-stats.mjs |
| `npm run test:results` | `src/PerfectRacket.jsx` results screen — server-render assertions (home wordmark present, non-destructive button, DOM order, no regression) | UI changes to the results screen |
| `npm run test:tension` | `src/PerfectRacket.jsx` tension prescriptions — type-aware floors (gut 48 / multi 46 / synth 44 / poly 42), range coherence, no drift on unfloored cases | ANY change to `calcTension` / `tensionRangePerformance` / string selection |
| `npm run test:scoring` | `src/PerfectRacket.jsx` scoring engines — 1,008-profile grid diff vs `scoring-baseline.json` | ANY change to PerfectRacket.jsx (must show **0/1008** for display-only changes) |
| `npm test` | all of the above | before a big push |

## How the API mocking works
`test/register.mjs` installs a module-resolution hook (`test/hooks.mjs`) that
redirects `@netlify/blobs` to `test/mock-blobs.mjs` (an in-memory store). That's
why `test:report` and `test:genfail` run with `node --import ./test/register.mjs`.
The battery also stubs `globalThis.fetch` to fake the Anthropic API (queue error
statuses, control the returned text/length). `GENREPORT_BACKOFF="[0,0,0]"` is set
so retries are instant in test.

## ⚠️ The scoring suite is blind to tension
`test:scoring` diffs top-3 **racket** picks only. A change to tension logic shows
a clean 0/1008 while silently altering every prescription in the product — which
is exactly how the natural-gut floor bug survived. That's why `test:tension`
exists. Run it for any tension work; 0/1008 alone does not mean "safe".

## Notes for a future session
- These replace the throwaway harness earlier sessions kept rebuilding in scratch.
  Extend them in place; don't reconstruct from memory.
- `test:scoring` bundles the JSX with esbuild and diffs against the committed
  baseline. After a *sanctioned* scoring change, re-save: `node test-scoring.mjs --save-baseline` (see `SCORING-RUNBOOK.md`).
- Files import the code under test via `new URL("../...", import.meta.url)`, so
  they run from any CWD (the npm scripts run from repo root).

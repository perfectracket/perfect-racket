// netlify/functions/genfail-stats.mjs
// Admin-only READ of the report-generation failure counters that
// generate-report.mjs writes to the meta blob store as
// `genfail:YYYY-MM-DD` and `genfail:YYYY-MM-DD:<reason>`.
//
// GET /api/admin/genfail   — auth: ADMIN_MINT_KEY via `x-admin-mint-key`
// header OR `?key=` query param (query is convenient in a browser; the URL
// then carries the key, so don't share it). Read-only; returns failure
// COUNTS only — no PII, no report content.
//
// Reason codes (from generate-report): api-429 / api-529 / api-5xx (throttle
// or transient API error, retries exhausted), api-4xx (permanent: bad
// request/auth/credits), api-error (network), bounds (model output out of the
// 160-450 word range or REPORT_UNAVAILABLE), deadline (retries ran past the
// 9s server budget), unknown.

import { getStore } from "@netlify/blobs";

export const config = { path: "/api/admin/genfail" };

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), { status, headers: { "content-type": "application/json" } });

export default async (req) => {
  const adminKey = process.env.ADMIN_MINT_KEY || "";
  const provided = req.headers.get("x-admin-mint-key") || new URL(req.url).searchParams.get("key") || "";
  // 404 (not 401) so the endpoint's existence isn't advertised without the key.
  if (!adminKey || provided !== adminKey) return json({ error: "not found" }, 404);

  const days = {};
  try {
    const meta = getStore("meta");
    const { blobs } = await meta.list({ prefix: "genfail:" });
    for (const b of blobs) {
      const rest = b.key.slice("genfail:".length); // "2026-07-17"  or  "2026-07-17:api-529"
      const count = +(await meta.get(b.key)) || 0;
      const c = rest.indexOf(":");
      if (c === -1) {
        (days[rest] = days[rest] || { total: 0, reasons: {} }).total = count;
      } else {
        const day = rest.slice(0, c), reason = rest.slice(c + 1);
        (days[day] = days[day] || { total: 0, reasons: {} }).reasons[reason] = count;
      }
    }
  } catch (e) {
    return json({ error: "read failed", detail: String((e && e.message) || e) }, 500);
  }

  const failuresByDay = Object.fromEntries(
    Object.entries(days).sort((a, b) => b[0].localeCompare(a[0])) // newest day first
  );
  return json({ generated: new Date().toISOString(), failuresByDay });
};

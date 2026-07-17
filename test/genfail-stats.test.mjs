// Test for netlify/functions/genfail-stats.mjs (admin failure-counter read).
// Run: node --import ./register.mjs genfail-test.mjs
import assert from "node:assert/strict";
import { getStore } from "./mock-blobs.mjs";

process.env.ADMIN_MINT_KEY = "secret-admin-key";

// Seed the meta store the way generate-report writes it, plus an unrelated key.
const meta = getStore("meta");
await meta.set("serial", "1234"); // must be ignored, must not leak
await meta.set("genfail:2026-07-17", "4");
await meta.set("genfail:2026-07-17:api-529", "2");
await meta.set("genfail:2026-07-17:deadline", "1");
await meta.set("genfail:2026-07-17:bounds", "1");
await meta.set("genfail:2026-07-16", "6");
await meta.set("genfail:2026-07-16:api-529", "6");
// off-length deliveries (successes, separate section)
await meta.set("genoff:2026-07-17:long", "9");
await meta.set("genoff:2026-07-17:short", "1");

const { default: handler } = await import(new URL("../netlify/functions/genfail-stats.mjs", import.meta.url).href);
const U = "https://perfectracket.com/api/admin/genfail";

let pass = 0;
const t = async (n, f) => { try { await f(); pass++; console.log("  ok  " + n); } catch (e) { console.error("FAIL " + n + " :: " + e.message); process.exitCode = 1; } };

await t("no key → 404 (existence not advertised)", async () => {
  assert.equal((await handler(new Request(U))).status, 404);
});
await t("wrong key → 404", async () => {
  assert.equal((await handler(new Request(U + "?key=nope"))).status, 404);
});
await t("right key via ?key= → 200 with correct per-day + reason breakdown", async () => {
  const res = await handler(new Request(U + "?key=secret-admin-key"));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.failuresByDay["2026-07-17"], { total: 4, reasons: { "api-529": 2, deadline: 1, bounds: 1 } });
  assert.deepEqual(body.failuresByDay["2026-07-16"], { total: 6, reasons: { "api-529": 6 } });
});
await t("unrelated meta key (serial) not leaked", async () => {
  const body = await (await handler(new Request(U + "?key=secret-admin-key"))).json();
  assert.ok(!JSON.stringify(body).includes("1234"), "serial value leaked");
  assert.ok(!("serial" in body.failuresByDay));
});
await t("newest day first", async () => {
  const body = await (await handler(new Request(U + "?key=secret-admin-key"))).json();
  assert.deepEqual(Object.keys(body.failuresByDay), ["2026-07-17", "2026-07-16"]);
});
await t("off-length deliveries reported in their own section", async () => {
  const body = await (await handler(new Request(U + "?key=secret-admin-key"))).json();
  assert.deepEqual(body.offLengthDeliveriesByDay["2026-07-17"].reasons, { long: 9, short: 1 });
  // and NOT mixed into failures
  assert.ok(!("long" in (body.failuresByDay["2026-07-17"].reasons)));
});
await t("right key via header also works", async () => {
  const res = await handler(new Request(U, { headers: { "x-admin-mint-key": "secret-admin-key" } }));
  assert.equal(res.status, 200);
});
await t("no ADMIN_MINT_KEY configured → 404 even with a key (fail closed)", async () => {
  const saved = process.env.ADMIN_MINT_KEY; delete process.env.ADMIN_MINT_KEY;
  const res = await handler(new Request(U + "?key=anything"));
  process.env.ADMIN_MINT_KEY = saved;
  assert.equal(res.status, 404);
});

console.log(`\n${pass} checks passed${process.exitCode ? " — WITH FAILURES" : ", 0 failures"}`);

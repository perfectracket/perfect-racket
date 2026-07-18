// Mocked-API battery for netlify/functions/generate-report.mjs.
// Focus: the July 17 report-generation resilience change (retry transient
// Anthropic failures + per-day failure counter) + standing regressions.
// Run: node --import ./register.mjs battery.mjs
import assert from "node:assert/strict";
import { _stores } from "./mock-blobs.mjs";

process.env.ANTHROPIC_API_KEY = "test-key";
process.env.GENREPORT_BACKOFF = "[0,0,0]"; // 3 attempts, zero backoff — instant retries in test

const words = (n, p = "w") => Array.from({ length: n }, (_, i) => `${p}${i}`).join(" ");
const GOOD_REPORT = `The fitting holds together. ${words(200)} — Tucker, Perfect Racket`;

let anthropicResponder = () => GOOD_REPORT;
let anthropicResponses = null;      // optional queue of {status, text}; else fall to responder
let lastAnthropicBody = null, anthropicCalls = 0;

globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes("api.anthropic.com")) {
    anthropicCalls++;
    lastAnthropicBody = JSON.parse(opts.body);
    const r = (anthropicResponses && anthropicResponses.length) ? anthropicResponses.shift() : { status: 200, text: anthropicResponder() };
    if (r.status && r.status !== 200) return new Response(JSON.stringify({ error: { type: "err" } }), { status: r.status });
    return new Response(JSON.stringify({ content: [{ type: "text", text: r.text != null ? r.text : anthropicResponder() }] }), { status: 200 });
  }
  throw new Error("unexpected outbound fetch: " + u);
};

const mod = await import(new URL("../netlify/functions/generate-report.mjs", import.meta.url).href);
const handler = mod.default;

let emailN = 0;
const basePayload = () => ({
  website: "", name: "Test Player", email: `battery${++emailN}@example.com`,
  ntrp: "4.0", ageRange: "36-45", playFrequency: "3-4x/wk", playStyle: "All-Court",
  swingSpeed: "Moderate", mode: "performance", priorityFocus: "Control",
  comfortVsPerf: "", painLocations: "", painSeverity: "", pastInjuries: "",
  currentRacket: "Babolat Pure Drive", stringType: "Polyester", gripSize: "4⅜", budget: "$260-$290",
  goals: "Add more power without sacrificing control",
  rank1: { model: "Yonex VCORE 98 2026", headSize: 98, weight: 305, swingWeight: 320, ra: 62, pattern: "16x19", price: 289, url: "https://www.tennisexpress.com/discount/tucktraining?redirect=x", strengths: ["Control"] },
  rank2: { model: "HEAD Speed MP 2026", headSize: 100, weight: 300, swingWeight: 318, ra: 60, pattern: "16x19", price: 279, url: "https://www.tennisexpress.com/discount/tucktraining?redirect=y" },
  rank3: { model: "Wilson Blade 98 16x19 v10", headSize: 98, weight: 306, swingWeight: 322, ra: 61, pattern: "16x19", price: 299, url: "https://evil.example.com/phish" },
  string1: "Head Lynx Tour 17", string2: "Tecnifibre NRG2 17", string3: "Wilson NXT 16",
  string1Url: "https://www.tennisexpress.com/discount/tucktraining?redirect=%2Fproducts%2Fs1",
  tensionRange: "48-52 lbs", tensionStart: "50",
});
const post = (p) => handler(new Request("https://perfectracket.com/api/generate-report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p) }), { ip: `10.0.0.${emailN % 250}` });
const dataBlock = () => lastAnthropicBody.messages[0].content;
const storedRecord = async (id) => JSON.parse(_stores().get("reports")._raw.get(id));
const metaGet = (k) => { const v = _stores().get("meta")._raw.get(k); return v == null ? 0 : +v; };
const today = new Date().toISOString().slice(0, 10);

let passed = 0;
const test = async (name, fn) => { try { await fn(); passed++; console.log(`  ok  ${name}`); } catch (e) { console.error(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; } };
const reset = () => { anthropicResponses = null; anthropicResponder = () => GOOD_REPORT; };

console.log("— Resilience: retry transient API errors —");

await test("429 then success → 200 report, exactly 2 API calls", async () => {
  reset(); anthropicResponses = [{ status: 429 }, { status: 200, text: GOOD_REPORT }];
  const before = anthropicCalls;
  const res = await post(basePayload());
  assert.equal(res.status, 200, "should recover to 200");
  assert.equal(anthropicCalls - before, 2, "should have retried once");
  const { url } = await res.json(); assert.ok(url, "report url returned");
});

await test("529 overloaded then success → 200", async () => {
  reset(); anthropicResponses = [{ status: 529 }, { status: 200, text: GOOD_REPORT }];
  const res = await post(basePayload());
  assert.equal(res.status, 200);
});

await test("two transient failures then success → 200, 3 calls (uses all attempts)", async () => {
  reset(); anthropicResponses = [{ status: 500 }, { status: 429 }, { status: 200, text: GOOD_REPORT }];
  const before = anthropicCalls;
  const res = await post(basePayload());
  assert.equal(res.status, 200);
  assert.equal(anthropicCalls - before, 3);
});

await test("permanent 400 is NOT retried → 502, exactly 1 API call", async () => {
  reset(); anthropicResponses = [{ status: 400 }, { status: 200, text: GOOD_REPORT }];
  const before = anthropicCalls;
  const res = await post(basePayload());
  assert.equal(res.status, 502, "permanent error must not recover");
  assert.equal(anthropicCalls - before, 1, "must not retry a permanent error");
});

await test("exhausted transient retries → 502 + failure counter (api-429) incremented", async () => {
  reset(); anthropicResponses = [{ status: 429 }, { status: 429 }, { status: 429 }];
  const beforeTotal = metaGet(`genfail:${today}`);
  const beforeReason = metaGet(`genfail:${today}:api-429`);
  const before = anthropicCalls;
  const res = await post(basePayload());
  assert.equal(res.status, 502);
  assert.equal(anthropicCalls - before, 3, "should exhaust all 3 attempts");
  assert.equal(metaGet(`genfail:${today}`), beforeTotal + 1, "daily failure counter +1");
  assert.equal(metaGet(`genfail:${today}:api-429`), beforeReason + 1, "reason counter +1");
});

console.log("— Resilience: bounds + success paths —");

await test("too-long complete report → DELIVERED (200), genoff:long, NOT a failure", async () => {
  reset(); anthropicResponder = () => `${words(600)} — Tucker, Perfect Racket`; // ~601 words > 520
  const beforeOff = metaGet(`genoff:${today}:long`), beforeFail = metaGet(`genfail:${today}`);
  const res = await post(basePayload());
  assert.equal(res.status, 200, "off-length but complete must be delivered, not blanked");
  assert.ok((await res.json()).url, "report url returned");
  assert.equal(metaGet(`genoff:${today}:long`), beforeOff + 1, "off-length delivery counted");
  assert.equal(metaGet(`genfail:${today}`), beforeFail, "must NOT count as a failure");
  reset();
});

await test("too-short-but-complete report (~100w) → DELIVERED (200), genoff:short", async () => {
  reset(); anthropicResponder = () => `${words(100)} — Tucker, Perfect Racket`; // ~102 words, in [60,160)
  const beforeOff = metaGet(`genoff:${today}:short`);
  const res = await post(basePayload());
  assert.equal(res.status, 200);
  assert.equal(metaGet(`genoff:${today}:short`), beforeOff + 1);
  reset();
});

await test("garbage (<60 words) still rejected → 502 + genfail:unavailable (3 attempts)", async () => {
  reset(); anthropicResponder = () => "far too short to be a report"; // 6 words < 60 = garbage
  const beforeReason = metaGet(`genfail:${today}:unavailable`);
  const before = anthropicCalls;
  const res = await post(basePayload());
  assert.equal(res.status, 502);
  assert.equal(anthropicCalls - before, 3, "garbage retried across all attempts");
  assert.equal(metaGet(`genfail:${today}:unavailable`), beforeReason + 1);
  reset();
});

await test("success on first try → 200, exactly 1 API call, no counter bump", async () => {
  reset();
  const beforeTotal = metaGet(`genfail:${today}`);
  const before = anthropicCalls;
  const res = await post(basePayload());
  assert.equal(res.status, 200);
  assert.equal(anthropicCalls - before, 1, "no retry on success");
  assert.equal(metaGet(`genfail:${today}`), beforeTotal, "counter unchanged on success");
});

await test("REPORT_UNAVAILABLE sentinel → 502 (still treated as unusable)", async () => {
  reset(); anthropicResponder = () => "REPORT_UNAVAILABLE";
  assert.equal((await post(basePayload())).status, 502);
  reset();
});

console.log("— Standing regressions —");

await test("goals still wrapped in the untrusted block", async () => {
  reset();
  await post(basePayload());
  assert.ok(dataBlock().includes("goals_next_year: <untrusted_player_input>Add more power without sacrificing control</untrusted_player_input>"));
});

await test("record shape intact, promptVersion v2.2, v4 string URLs, bad rank URL dropped", async () => {
  reset();
  const { id } = await (await post(basePayload())).json();
  const rec = await storedRecord(id);
  assert.equal(rec.promptVersion, "v2.2-2026-07-08");
  assert.equal(rec.recordVersion, 4);
  assert.equal(rec.ranks[2].shopUrl, "", "non-allowlisted rank URL dropped");
  assert.deepEqual(rec.strings[0], { name: "Head Lynx Tour 17", url: "https://www.tennisexpress.com/discount/tucktraining?redirect=%2Fproducts%2Fs1" });
});

await test("stripMarkdown still strips; honeypot still rejects", async () => {
  reset(); anthropicResponder = () => `# H\n**bold** \`x\`. ${words(180)} — Tucker, Perfect Racket`;
  const { text } = await (await post(basePayload())).json();
  assert.ok(!text.includes("**") && !text.includes("`") && !/^#/m.test(text));
  reset();
  const p = basePayload(); p.website = "bot";
  assert.equal((await post(p)).status, 400);
});

// ==============================================================================
console.log("— Reserved-URL flow: client report ids —");

const view = (await import(new URL("../netlify/functions/report-view.mjs", import.meta.url).href)).default;
const renderReport = (id) => view(new Request(`https://perfectracket.com/report/${id}`));
const CID = () => "C" + "x".repeat(20).replace(/x/g, () => "abcdefghij0123456789_-"[Math.floor(Math.random() * 22)]);
const mutateRecord = (id, fn) => { const raw = _stores().get("reports")._raw; const r = JSON.parse(raw.get(id)); fn(r); raw.set(id, JSON.stringify(r)); };

await test("valid client id honored — record stored at the reserved id", async () => {
  reset();
  const cid = CID();
  const p = basePayload(); p.reportId = cid;
  const res = await post(p);
  assert.equal(res.status, 200);
  const { id, url } = await res.json();
  assert.equal(id, cid, "server must use the reserved id");
  assert.ok(url.endsWith(`/report/${cid}`));
  const rec = await storedRecord(cid);
  assert.ok(rec.text && !rec.pending, "full record at reserved id, placeholder overwritten");
});

await test("malformed client ids ignored (short / bad chars / non-string) — server id used", async () => {
  reset();
  for (const bad of ["short", "x".repeat(22), "has spaces in it 21ch", 12345, "<script>aaaaaaaaaaaaa"]) {
    const p = basePayload(); p.reportId = bad;
    const { id } = await (await post(p)).json();
    assert.notEqual(id, bad);
    assert.match(id, /^[A-Za-z0-9_-]{21}$/, "fallback id has full entropy format");
  }
});

await test("SECURITY: client id pointing at an EXISTING record cannot overwrite it", async () => {
  reset();
  const victim = basePayload();
  const { id: victimId } = await (await post(victim)).json();
  const victimText = (await storedRecord(victimId)).text;
  const attacker = basePayload(); // fresh email
  attacker.reportId = victimId;   // tries to claim the victim's id
  const res = await post(attacker);
  assert.equal(res.status, 200);
  const { id: attackerId } = await res.json();
  assert.notEqual(attackerId, victimId, "attacker must get a different id");
  assert.equal((await storedRecord(victimId)).text, victimText, "victim record untouched");
});

await test("failed generation leaves a pending placeholder at the reserved id", async () => {
  reset(); anthropicResponder = () => "far too short to be a report"; // garbage → 502
  const cid = CID();
  const p = basePayload(); p.reportId = cid;
  assert.equal((await post(p)).status, 502);
  const rec = await storedRecord(cid);
  assert.ok(rec.pending && !rec.text, "placeholder remains for honest pending/stale states");
  reset();
});

await test("pending FRESH renders 'being written' page; STALE renders honest failure + retake", async () => {
  reset(); anthropicResponder = () => "far too short to be a report";
  const cid = CID();
  const p = basePayload(); p.reportId = cid;
  await post(p);
  reset();
  let res = await renderReport(cid);
  assert.equal(res.status, 200);
  let html = await res.text();
  assert.ok(html.includes("Being written now") && html.includes('http-equiv="refresh"'), "fresh pending page");
  mutateRecord(cid, (r) => { r.createdAt = new Date(Date.now() - 20 * 60000).toISOString(); });
  res = await renderReport(cid);
  assert.equal(res.status, 404);
  html = await res.text();
  assert.ok(html.includes("couldn't be completed") && html.includes("Retake the fitting"), "honest stale page");
  assert.ok(!html.includes("Being written"), "stale page must not promise generation");
});

await test("quick retake (refresh window) with a new client id → canonical id returned + redirect stub", async () => {
  reset();
  const p1 = basePayload();
  const email = p1.email;
  const { id: firstId } = await (await post(p1)).json();
  const p2 = basePayload(); p2.email = email; // same email, within refresh window
  const cid2 = CID(); p2.reportId = cid2;
  const { id: secondId } = await (await post(p2)).json();
  assert.equal(secondId, firstId, "refresh guard returns the canonical id");
  const stub = await storedRecord(cid2);
  assert.equal(stub.redirectTo, firstId, "reserved id carries a redirect stub");
  const res = await renderReport(cid2);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), `/report/${firstId}`);
});

await test("retake BEYOND window keeps canonical URL (overwrites old id) + stubs the reserved id", async () => {
  reset();
  const p1 = basePayload();
  const email = p1.email;
  const { id: firstId } = await (await post(p1)).json();
  mutateRecord(firstId, (r) => { r.createdAt = new Date(Date.now() - 30 * 60000).toISOString(); });
  const p2 = basePayload(); p2.email = email;
  const cid2 = CID(); p2.reportId = cid2;
  const { id: secondId } = await (await post(p2)).json();
  assert.equal(secondId, firstId, "canonical-URL-per-email preserved");
  assert.equal((await storedRecord(cid2)).redirectTo, firstId);
});

await test("retake-with-failure never clobbers the old report with a placeholder", async () => {
  reset();
  const p1 = basePayload();
  const email = p1.email;
  const { id: firstId } = await (await post(p1)).json();
  const oldText = (await storedRecord(firstId)).text;
  mutateRecord(firstId, (r) => { r.createdAt = new Date(Date.now() - 30 * 60000).toISOString(); });
  anthropicResponder = () => "far too short to be a report"; // retake fails
  const p2 = basePayload(); p2.email = email; p2.reportId = CID();
  assert.equal((await post(p2)).status, 502);
  const rec = await storedRecord(firstId);
  assert.equal(rec.text, oldText, "old report intact — no pending overwrite on retakes");
  reset();
});

await test("no reportId at all (mint-backlog path) unchanged — server mints id", async () => {
  reset();
  const { id } = await (await post(basePayload())).json();
  assert.match(id, /^[A-Za-z0-9_-]{21}$/);
});

await test("complete records still render normally (no pending/redirect interference)", async () => {
  reset();
  const cid = CID();
  const p = basePayload(); p.reportId = cid;
  await post(p);
  const res = await renderReport(cid);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes("The fitting holds together") || html.includes("Fitting Notes") || html.includes("fitting"), "report body renders");
  assert.ok(!html.includes("Being written now"));
});

console.log(`\n${passed} assertion groups passed${process.exitCode ? " — WITH FAILURES" : ", 0 failures"}`);

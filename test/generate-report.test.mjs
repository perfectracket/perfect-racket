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

console.log(`\n${passed} assertion groups passed${process.exitCode ? " — WITH FAILURES" : ", 0 failures"}`);

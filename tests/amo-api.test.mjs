// Tests for the AMO API client's handling of throttling. Usage: node tests/amo-api.test.mjs
import assert from "node:assert/strict";
import { amoRequest, throttleWait } from "../scripts/amo-api.mjs";

assert.equal(throttleWait(null, '{"detail":"Request was throttled. Expected available in 8 seconds."}', 2), 8);
assert.equal(throttleWait(null, '{"detail":"Request was throttled. Expected available in 1 second."}', 2), 1);
assert.equal(throttleWait("12", "Expected available in 8 seconds.", 2), 12);
assert.equal(throttleWait(null, "Bad gateway", 4), 4);

// Replays canned responses and records what was sent and how long it waited.
function fake(responses) {
  const calls = [];
  const waits = [];
  return {
    calls,
    waits,
    options: {
      issuer: "user:1",
      secret: "secret",
      log: () => {},
      wait: async (seconds) => waits.push(seconds),
      fetchImpl: async (url, init) => {
        calls.push({ url, ...init });
        const [status, body, headers = {}] = responses.shift();
        return { status, ok: status >= 200 && status < 300, text: async () => body, headers: new Headers(headers) };
      }
    }
  };
}

{
  const { calls, waits, options } = fake([
    [429, '{"detail":"Request was throttled. Expected available in 8 seconds."}'],
    [503, "Service unavailable"],
    [200, '{"id":42}']
  ]);
  let bodies = 0;
  const result = await amoRequest("PATCH", "https://example.test/v/", { ...options, makeBody: () => ({ n: ++bodies }) });
  assert.deepEqual(result, { id: 42 });
  assert.deepEqual(waits, [9, 4], "waits what AMO asks for plus a second, then backs off");
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map((c) => c.body), ['{"n":1}', '{"n":2}', '{"n":3}'], "builds a fresh body per attempt");
  assert.equal(calls[0].headers["Content-Type"], "application/json");
  assert.match(calls[0].headers.Authorization, /^JWT [\w-]+\.[\w-]+\.[\w-]+$/);
}

{
  const { calls, options } = fake([[400, '{"source":["Unsupported file type"]}']]);
  await assert.rejects(amoRequest("PATCH", "https://example.test/v/", options), /400 .*Unsupported file type/);
  assert.equal(calls.length, 1, "client errors aren't retried");
}

{
  const { calls, options } = fake([[429, '{"detail":"Request was throttled. Expected available in 3600 seconds."}']]);
  await assert.rejects(amoRequest("GET", "https://example.test/v/", options), /429/);
  assert.equal(calls.length, 1, "gives up when AMO asks for a longer wait than the job can afford");
}

{
  const { calls, options } = fake([[200, ""]]);
  const form = new FormData();
  form.set("source", new File(["zip"], "source.zip"));
  assert.equal(await amoRequest("PATCH", "https://example.test/v/", { ...options, makeBody: () => form }), null);
  assert.equal(calls[0].body, form, "sends FormData as is");
  assert.equal(calls[0].headers["Content-Type"], undefined, "lets fetch set the multipart boundary");
}

console.log("amo-api tests passed");

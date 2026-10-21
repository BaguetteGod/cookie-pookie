// Small client for the addons.mozilla.org API v5, shared by the scripts that
// talk to it. AMO throttles bursts of requests with HTTP 429 ("Request was
// throttled. Expected available in 8 seconds."); requests are retried after
// the wait AMO asks for, and after server errors with a growing backoff.
import crypto from "node:crypto";

export const API = "https://addons.mozilla.org/api/v5/addons/addon";

const MAX_ATTEMPTS = 8;
const MAX_WAIT = 600; // seconds; give up rather than outlast the job timeout

// AMO's API takes a short-lived JWT signed with the API secret.
export function token(issuer, secret) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (data) => Buffer.from(JSON.stringify(data)).toString("base64url");
  const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ iss: issuer, jti: crypto.randomUUID(), iat: now, exp: now + 60 })}`;
  return `${unsigned}.${crypto.createHmac("sha256", secret).update(unsigned).digest("base64url")}`;
}

// Seconds to wait before retrying a throttled request: the Retry-After header,
// else the number in "Expected available in N seconds", else `fallback`.
export function throttleWait(retryAfter, body, fallback) {
  const header = Number(retryAfter);
  if (retryAfter && Number.isFinite(header)) return Math.ceil(header);
  const match = String(body).match(/available in (\d+) seconds?/);
  return match ? Number(match[1]) : fallback;
}

const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

// Sends a request and returns the parsed JSON response (or null if empty).
// `makeBody` returns the body for each attempt: a plain object (sent as JSON) or a FormData.
export async function amoRequest(method, url, { issuer, secret, makeBody, fetchImpl = fetch, wait = sleep, log = console.warn } = {}) {
  for (let attempt = 1; ; attempt++) {
    const body = makeBody?.();
    const headers = { Authorization: `JWT ${token(issuer, secret)}`, Accept: "application/json" };
    if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
    const response = await fetchImpl(url, {
      method,
      headers,
      body: body && !(body instanceof FormData) ? JSON.stringify(body) : body
    });
    const text = await response.text();
    if (response.ok) return text ? JSON.parse(text) : null;

    const retryable = response.status === 429 || response.status >= 500;
    const seconds = response.status === 429
      ? throttleWait(response.headers.get("retry-after"), text, 2 ** attempt) + 1
      : 2 ** attempt;
    if (!retryable || attempt >= MAX_ATTEMPTS || seconds > MAX_WAIT) {
      throw new Error(`${method} ${url} failed: ${response.status} ${text}`);
    }
    log(`${method} ${url} got ${response.status}; retrying in ${seconds}s (attempt ${attempt + 1} of ${MAX_ATTEMPTS}).`);
    await wait(seconds);
  }
}

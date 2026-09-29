import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, apiFetch } from "../src/lib/transport";
import { internalApiOrigin } from "../src/lib/config";

test("transport handles JSON, 204 and server problems", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      });
    assert.deepEqual(await apiFetch("/api/v1/products"), { ok: true });
    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await apiFetch("/api/v1/products"), undefined);
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ title: "Bad Request", requestId: "r1" }), {
        status: 400,
        headers: { "content-type": "application/problem+json" },
      });
    await assert.rejects(
      apiFetch("/api/v1/products"),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 400 &&
        error.requestId === "r1",
    );
    globalThis.fetch = async () => new Response("broken", { status: 502 });
    await assert.rejects(
      apiFetch("/api/v1/products"),
      (error: unknown) => error instanceof ApiError && error.status === 502,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("transport rejects unsafe paths and server origin credentials", async () => {
  await assert.rejects(
    apiFetch("https://elsewhere.test/api/x"),
    /Invalid API path/,
  );
  assert.throws(
    () =>
      internalApiOrigin({
        INTERNAL_API_ORIGIN: "http://user:pass@localhost:4000",
      }),
    /Invalid/,
  );
});

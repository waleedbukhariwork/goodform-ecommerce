import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import { gunzipSync } from "node:zlib";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for integration tests");
const env = { ...process.env, APP_ENV: "dev", DATABASE_URL: databaseUrl };
const pool = new pg.Pool({ connectionString: databaseUrl });

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  const port = address.port;
  server.close();
  await once(server, "close");
  return port;
}
async function startApi(database: string, overrides: NodeJS.ProcessEnv = {}) {
  const port = await freePort();
  const child = spawn(process.execPath, ["dist/src/main.js"], {
    cwd: process.cwd(),
    env: { ...env, DATABASE_URL: database, PORT: String(port), ...overrides },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  let stdout = "";
  child.stdout?.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const base = "http://127.0.0.1:" + port;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null)
      throw new Error("API exited before startup: " + stderr);
    try {
      if ((await fetch(base + "/api/v1/health/live")).ok)
        return {
          child,
          base,
          getStderr: () => stderr,
          getStdout: () => stdout,
        };
    } catch {
      /* startup pending */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  child.kill();
  throw new Error("API startup timeout: " + stderr);
}
async function stopApi(child: ChildProcess) {
  child.kill();
  if (child.exitCode === null) await once(child, "exit");
}

test("real PostgreSQL migration, seed, HTTP validation, caching and outage behavior", async () => {
  for (let round = 0; round < 2; round++) {
    execFileSync(process.execPath, ["--import", "tsx", "scripts/migrate.ts"], {
      env,
      cwd: process.cwd(),
    });
    execFileSync(process.execPath, ["--import", "tsx", "scripts/seed.ts"], {
      env,
      cwd: process.cwd(),
    });
  }
  const count = await pool.query("select count(*)::int as count from products");
  assert.equal(count.rows[0].count, 8);
  const api = await startApi(databaseUrl);
  try {
    const list = await fetch(api.base + "/api/v1/products");
    assert.equal(list.status, 200);
    assert.equal((await list.json()).items.length, 8);
    assert.match(list.headers.get("cache-control") ?? "", /must-revalidate/);
    const etag = list.headers.get("etag");
    assert.ok(etag);
    const conditional = await fetch(api.base + "/api/v1/products", {
      headers: { "if-none-match": etag },
    });
    assert.equal(conditional.status, 304);
    const detail = await fetch(api.base + "/api/v1/products/canvas-overshirt");
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).sizes.length, 3);
    assert.equal(
      (await fetch(api.base + "/api/v1/products/missing-product")).status,
      404,
    );
    for (const suffix of ["?page=-1", "?pageSize=100", "?unknown=1"]) {
      const bad = await fetch(api.base + "/api/v1/products" + suffix);
      assert.equal(bad.status, 400, suffix);
      assert.match(bad.headers.get("content-type") ?? "", /problem\+json/);
      const body = await bad.json();
      assert.equal(body.instance, "/api/v1/products");
      assert.ok(body.requestId);
      assert.ok(!JSON.stringify(body).includes("unknown=1"));
    }
    try {
      await pool.query(
        "update products set price_cents = price_cents + 1 where slug = 'canvas-overshirt'",
      );
      const changed = await fetch(api.base + "/api/v1/products", {
        headers: { "if-none-match": etag },
      });
      assert.equal(changed.status, 200);
      assert.notEqual(changed.headers.get("etag"), etag);
    } finally {
      await pool.query(
        "update products set price_cents = 7900 where slug = 'canvas-overshirt'",
      );
    }
    await assert.rejects(
      pool.query(
        "insert into products (slug,name,description,category,color,price_cents,image_path,sizes) values ('invalid-price','x','x','x','x',-1,'/x','[]')",
      ),
      /price_cents_nonnegative/,
    );
    await pool.query(
      "select pg_terminate_backend(pid) from pg_stat_activity where application_name = 'goodform-api' and pid <> pg_backend_pid()",
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(api.child.exitCode, null, "idle connection error crashed API");
    assert.equal(
      (await fetch(api.base + "/api/v1/products")).status,
      200,
      "API did not reconnect after idle connection termination",
    );
    assert.ok(!api.getStderr().includes("terminating connection"));
  } finally {
    await stopApi(api.child);
  }

  const unavailableUrl = new URL(databaseUrl);
  unavailableUrl.port = "1";
  unavailableUrl.pathname = "/missing";
  const offline = await startApi(unavailableUrl.href);
  try {
    assert.equal(
      (await fetch(offline.base + "/api/v1/health/live")).status,
      200,
    );
    const ready = await fetch(offline.base + "/api/v1/health/ready");
    assert.equal(ready.status, 503);
    const failed = await fetch(
      offline.base + "/api/v1/products?q=private-value",
    );
    assert.equal(failed.status, 500);
    const body = await failed.text();
    assert.ok(!body.includes("private-value"));
    if (unavailableUrl.password)
      assert.ok(!body.includes(unavailableUrl.password));
    assert.ok(!offline.getStderr().includes("private-value"));
    if (unavailableUrl.password)
      assert.ok(!offline.getStderr().includes(unavailableUrl.password));
  } finally {
    await stopApi(offline.child);
  }
  await pool.end();
});

test("Observe stays offline when disabled and exports a redacted HTTP-to-pg trace when enabled", async () => {
  const requests: Buffer[] = [];
  let collectorStatus = 202;
  const collector = createHttpServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      requests.push(Buffer.concat(chunks));
      response.writeHead(collectorStatus).end();
    });
  });
  const collectorPort = await freePort();
  collector.listen(collectorPort, "127.0.0.1");
  await once(collector, "listening");
  const endpoint = "http://127.0.0.1:" + collectorPort;
  const fixtureKey = randomUUID();
  const fixtureSecret = randomUUID();
  const options = {
    OBSERVE_ENDPOINT: endpoint,
    OBSERVE_APP_KEY: fixtureKey,
    OBSERVE_APP_SECRET: fixtureSecret,
    OBSERVE_SERVICE_ID: "goodform-local-test",
    OBSERVE_SAMPLE_RATE: "1",
  };
  try {
    const disabled = await startApi(databaseUrl, {
      ...options,
      OBSERVE_ENABLED: "false",
    });
    try {
      assert.equal(
        (await fetch(disabled.base + "/api/v1/products")).status,
        200,
      );
      await new Promise((resolve) => setTimeout(resolve, 2300));
      assert.equal(requests.length, 0);
    } finally {
      await stopApi(disabled.child);
    }

    const enabled = await startApi(databaseUrl, {
      ...options,
      OBSERVE_ENABLED: "true",
    });
    try {
      const sentinel = "search-" + randomUUID();
      const requestId = randomUUID();
      const response = await fetch(
        enabled.base + "/api/v1/products?q=" + sentinel,
        {
          headers: { "x-request-id": requestId },
        },
      );
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-request-id"), requestId);
      for (let attempt = 0; attempt < 40 && requests.length === 0; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      assert.ok(requests.length > 0, "local collector received no trace");
      const payload = requests
        .map((data) =>
          (data[0] === 0x1f && data[1] === 0x8b
            ? gunzipSync(data)
            : data
          ).toString("utf8"),
        )
        .join("\n");
      assert.ok(!payload.includes(sentinel), "query leaked to telemetry");
      assert.ok(
        !payload.includes(fixtureKey) && !payload.includes(fixtureSecret),
        "collector credentials leaked into payload",
      );
      assert.match(
        payload,
        /SELECT|select/,
        "no database query span in local trace",
      );
      const stdout = enabled.getStdout();
      assert.ok(stdout.includes(requestId));
      assert.ok(!stdout.includes(sentinel));
      assert.ok(!stdout.includes(fixtureSecret));
      assert.ok(stdout.includes('"traceId":"' + requestId + '"'));
      collectorStatus = 503;
      for (let i = 0; i < 5; i++) {
        assert.equal(
          (await fetch(enabled.base + "/api/v1/products")).status,
          200,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 2300));
      assert.ok(requests.length >= 2, "collector outage was not exercised");
      for (const output of [enabled.getStdout(), enabled.getStderr()]) {
        assert.ok(!output.includes(sentinel));
        assert.ok(!output.includes(fixtureKey));
        assert.ok(!output.includes(fixtureSecret));
        if (new URL(databaseUrl).password)
          assert.ok(!output.includes(new URL(databaseUrl).password));
      }
    } finally {
      await stopApi(enabled.child);
    }
  } finally {
    collector.close();
    await once(collector, "close");
  }
});

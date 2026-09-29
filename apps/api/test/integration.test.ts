import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
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
async function startApi(database: string) {
  const port = await freePort();
  const child = spawn(process.execPath, ["dist/src/main.js"], {
    cwd: process.cwd(),
    env: { ...env, DATABASE_URL: database, PORT: String(port) },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const base = "http://127.0.0.1:" + port;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null)
      throw new Error("API exited before startup: " + stderr);
    try {
      if ((await fetch(base + "/api/v1/health/live")).ok)
        return { child, base, getStderr: () => stderr };
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

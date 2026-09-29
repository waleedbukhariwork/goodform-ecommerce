import "reflect-metadata";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { apiConfig } from "../src/config.js";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { ListProductsQuery } from "../src/modules/catalog/presentation/catalog.dto.js";

test("API configuration rejects missing database URL and invalid environment", () => {
  assert.throws(
    () => apiConfig({ APP_ENV: "dev" }),
    /Invalid API runtime configuration/,
  );
  assert.throws(
    () => apiConfig({ APP_ENV: "unknown", DATABASE_URL: "postgres://x@y/z" }),
    /Invalid API runtime configuration/,
  );
});
test("catalog query enforces bounded numeric pagination", () => {
  const bad = plainToInstance(ListProductsQuery, { page: -1, pageSize: 100 });
  assert.ok(validateSync(bad).length >= 2);
  const good = plainToInstance(ListProductsQuery, { page: "2", pageSize: "8" });
  assert.equal(validateSync(good).length, 0);
  assert.equal(good.page, 2);
});

test("staging requires its own database, namespace and session key", () => {
  const directory = mkdtempSync(join(tmpdir(), "goodform-config-"));
  const key = join(directory, "session-key");
  const database = join(directory, "database-url");
  const base = {
    APP_ENV: "staging",
    NODE_ENV: "production",
    DATABASE_URL_FILE: database,
    SESSION_KEY_FILE: key,
    MEDIA_NAMESPACE: "staging-catalog",
  };
  try {
    writeFileSync(key, "staging-only-session-key-with-32-chars");
    writeFileSync(database, "postgres://user:pass@db/goodform_staging");
    assert.equal(apiConfig(base).APP_ENV, "staging");
    assert.throws(
      () => apiConfig({ ...base, NODE_ENV: "development" }),
      /Invalid API runtime configuration/,
    );
    assert.throws(
      () => apiConfig({ ...base, MEDIA_NAMESPACE: "production-media" }),
      /Invalid API runtime configuration/,
    );
    writeFileSync(database, "postgres://user:pass@db/goodform_production");
    assert.throws(() => apiConfig(base), /Invalid API runtime configuration/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Observe remains opt-in and rejects incomplete enabled credentials", () => {
  const base = {
    APP_ENV: "dev",
    DATABASE_URL: "postgres://user:pass@localhost/goodform_dev",
  };
  assert.equal(apiConfig(base).OBSERVE_ENABLED, false);
  assert.throws(
    () => apiConfig({ ...base, OBSERVE_ENABLED: "true" }),
    /Invalid API runtime configuration/,
  );
  assert.throws(
    () => apiConfig({ ...base, OBSERVE_ENABLED: "sometimes" }),
    /Invalid API runtime configuration/,
  );
});

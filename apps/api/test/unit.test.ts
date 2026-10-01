import "reflect-metadata";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { HttpException, HttpStatus } from "@nestjs/common";
import { apiConfig } from "../src/config.js";
import { codeForException, publicException } from "../src/public-code.js";
import {
  accountStateFrom,
  allowLookup,
} from "../src/modules/identity/domain/account-state.js";
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
    assert.equal(apiConfig(base).MAIL_ENABLED, false);
    assert.equal(
      apiConfig({
        ...base,
        MAIL_ENABLED: "true",
        MAIL_FROM: "Goodform <reply@example.com>",
        RESEND_API_KEY: "re_testkey",
      }).MAIL_ENABLED,
      true,
    );
    assert.equal(
      apiConfig({
        APP_ENV: "dev",
        DATABASE_URL: "postgres://user:pass@localhost/goodform_dev",
        MAIL_ENABLED: "true",
        MAIL_FROM: "Goodform <reply@example.com>",
        RESEND_API_KEY: "re_testkey",
      }).MAIL_ENABLED,
      false,
    );
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

test("account lookup reports only new, verified, or unverified", () => {
  assert.equal(accountStateFrom(undefined), "new");
  assert.equal(accountStateFrom({ emailVerified: false }), "unverified");
  assert.equal(accountStateFrom({ emailVerified: true }), "verified");
  const buckets = new Map<string, { count: number; reset: number }>();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    assert.equal(allowLookup(buckets, "203.0.113.5", 1_000), true);
  }
  assert.equal(allowLookup(buckets, "203.0.113.5", 1_000), false);
  assert.equal(allowLookup(buckets, "203.0.113.9", 1_000), true);
});

test("shopper errors expose only a public code", () => {
  assert.equal(
    codeForException(
      publicException(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK"),
      409,
    ),
    "INSUFFICIENT_STOCK",
  );
  assert.equal(
    codeForException(
      new HttpException(
        { message: "postgres://user:secret@db/goodform", code: "DATABASE_URL" },
        500,
      ),
      500,
    ),
    "INTERNAL_ERROR",
  );
  assert.equal(
    codeForException(
      new HttpException("Stripe secret sk_test_hidden", 503),
      503,
    ),
    "UNAVAILABLE",
  );
});

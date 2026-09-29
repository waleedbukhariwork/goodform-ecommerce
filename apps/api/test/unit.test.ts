import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { apiConfig } from "../src/config.js";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { ListProductsQuery } from "../src/modules/catalog/presentation/catalog.dto.js";

test("API configuration rejects missing database URL and invalid environment", () => {
  assert.throws(
    () => apiConfig({ APP_ENV: "dev" }),
    /Invalid API configuration/,
  );
  assert.throws(
    () => apiConfig({ APP_ENV: "unknown", DATABASE_URL: "postgres://x@y/z" }),
    /Invalid API configuration/,
  );
});
test("catalog query enforces bounded numeric pagination", () => {
  const bad = plainToInstance(ListProductsQuery, { page: -1, pageSize: 100 });
  assert.ok(validateSync(bad).length >= 2);
  const good = plainToInstance(ListProductsQuery, { page: "2", pageSize: "8" });
  assert.equal(validateSync(good).length, 0);
  assert.equal(good.page, 2);
});

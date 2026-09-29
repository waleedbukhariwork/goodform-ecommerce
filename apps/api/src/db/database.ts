import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { runtimeConfig } from "../config.js";
import * as schema from "./schema.js";
import { safeLog } from "../logging.js";

@Injectable()
export class Database implements OnModuleDestroy {
  readonly pool: pg.Pool;
  readonly client: ReturnType<typeof drizzle<typeof schema>>;

  constructor(
    @Inject(runtimeConfig.KEY) config: ConfigType<typeof runtimeConfig>,
  ) {
    this.pool = new pg.Pool({
      connectionString: config.DATABASE_URL,
      application_name: "goodform-api",
      max: 5,
      connectionTimeoutMillis: 1500,
    });
    // PostgreSQL restarts reject idle clients; consume the pool event without
    // printing driver errors, then let later requests use fresh connections.
    this.pool.on("error", () =>
      safeLog(config, "warn", "database_connection_error"),
    );
    this.client = drizzle(this.pool, { schema });
  }

  async ready() {
    await this.pool.query("select 1 from products limit 0");
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}

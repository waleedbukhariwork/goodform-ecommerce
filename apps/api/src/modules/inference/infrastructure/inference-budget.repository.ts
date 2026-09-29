import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import { inferenceDailyCalls } from "../../../db/schema.js";

export class InferenceBudgetRepository {
  private readonly pool: pg.Pool;
  private readonly db;
  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({
      connectionString: databaseUrl,
      max: 1,
      connectionTimeoutMillis: 1500,
    });
    this.pool.on("error", () => {
      /* an idle disconnect is handled by the next query */
    });
    this.db = drizzle(this.pool);
  }
  async reserve(project: string, cap: number) {
    const day = new Date().toISOString().slice(0, 10);
    const [row] = await this.db
      .insert(inferenceDailyCalls)
      .values({ key: `${project}:${day}`, count: 1 })
      .onConflictDoUpdate({
        target: inferenceDailyCalls.key,
        set: { count: sql`${inferenceDailyCalls.count} + 1` },
      })
      .returning({ count: inferenceDailyCalls.count });
    return row.count <= cap;
  }
  async close() {
    await this.pool.end();
  }
}

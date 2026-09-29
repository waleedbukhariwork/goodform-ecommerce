import { Injectable } from "@nestjs/common";
import { count, eq, ilike, or } from "drizzle-orm";
import { Database } from "../../../db/database.js";
import { products } from "../../../db/schema.js";

@Injectable()
export class CatalogRepository {
  constructor(private readonly db: Database) {}

  async list(q: string | undefined, page: number, pageSize: number) {
    const term = q?.trim().replace(/[\\%_]/g, "\\$&");
    const where = term
      ? or(
          ilike(products.name, "%" + term + "%"),
          ilike(products.description, "%" + term + "%"),
        )
      : undefined;
    const [rows, totals] = await Promise.all([
      this.db.client
        .select()
        .from(products)
        .where(where)
        .orderBy(products.name)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.client.select({ value: count() }).from(products).where(where),
    ]);
    return { rows, total: totals[0].value };
  }

  async bySlug(slug: string) {
    return (
      await this.db.client
        .select()
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1)
    )[0];
  }
}

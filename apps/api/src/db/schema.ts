import {
  check,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type SizeMeasurement = {
  size: string;
  chestCm: number;
  lengthCm: number;
  shoulderCm: number;
};

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 60 }).notNull(),
    color: varchar("color", { length: 60 }).notNull(),
    priceCents: integer("price_cents").notNull(),
    imagePath: text("image_path").notNull(),
    sizes: jsonb("sizes").$type<SizeMeasurement[]>().notNull(),
  },
  (table) => [check("price_cents_nonnegative", sql`${table.priceCents} >= 0`)],
);

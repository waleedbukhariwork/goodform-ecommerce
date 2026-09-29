import {
  bigint,
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    size: varchar("size", { length: 16 }).notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    uniqueIndex("cart_user_product_size").on(
      table.userId,
      table.productId,
      table.size,
    ),
    check("cart_quantity_bounded", sql`${table.quantity} BETWEEN 1 AND 10`),
  ],
);

export const inventoryStock = pgTable(
  "inventory_stock",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    size: varchar("size", { length: 16 }).notNull(),
    available: integer("available").notNull(),
    onHand: integer("on_hand").notNull(),
  },
  (table) => [
    uniqueIndex("inventory_product_size").on(table.productId, table.size),
    check("inventory_available_nonnegative", sql`${table.available} >= 0`),
    check(
      "inventory_on_hand_valid",
      sql`${table.onHand} >= ${table.available}`,
    ),
  ],
);

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 16 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "reservation_status_valid",
      sql`${table.status} IN ('active', 'released', 'consumed')`,
    ),
  ],
);

export const reservationItems = pgTable(
  "reservation_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    size: varchar("size", { length: 16 }).notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    check(
      "reservation_item_quantity_bounded",
      sql`${table.quantity} BETWEEN 1 AND 10`,
    ),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reservationId: uuid("reservation_id")
      .notNull()
      .unique()
      .references(() => reservations.id),
    status: varchar("status", { length: 24 }).notNull(),
    totalCents: bigint("total_cents", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "order_status_valid",
      sql`${table.status} IN ('payment_pending', 'paid', 'failed', 'cancelled')`,
    ),
    check("order_total_nonnegative", sql`${table.totalCents} >= 0`),
  ],
);

export const orderLines = pgTable(
  "order_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    slug: varchar("slug", { length: 100 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    imagePath: text("image_path").notNull(),
    size: varchar("size", { length: 16 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    lineTotalCents: bigint("line_total_cents", { mode: "number" }).notNull(),
  },
  (table) => [
    check("order_line_quantity_valid", sql`${table.quantity} BETWEEN 1 AND 10`),
    check("order_line_price_nonnegative", sql`${table.unitPriceCents} >= 0`),
    check("order_line_total_nonnegative", sql`${table.lineTotalCents} >= 0`),
  ],
);

export const checkoutAttempts = pgTable(
  "checkout_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    idempotencyKey: varchar("idempotency_key", { length: 100 }).notNull(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservations.id),
    orderId: uuid("order_id")
      .unique()
      .references(() => orders.id),
    stripeSessionId: text("stripe_session_id").unique(),
    checkoutUrl: text("checkout_url"),
    status: varchar("status", { length: 16 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("checkout_user_key").on(table.userId, table.idempotencyKey),
    check(
      "checkout_attempt_status_valid",
      sql`${table.status} IN ('started', 'ready', 'uncertain')`,
    ),
  ],
);

export const processedStripeEvents = pgTable("processed_stripe_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const checkoutRateLimits = pgTable(
  "checkout_rate_limits",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    windowStart: timestamp("window_start").notNull(),
    count: integer("count").notNull(),
  },
  (table) => [check("checkout_rate_count_positive", sql`${table.count} >= 1`)],
);

export const inferenceDailyCalls = pgTable("inference_daily_calls", {
  key: varchar("key", { length: 64 }).primaryKey(),
  count: integer("count").notNull(),
});

/**
 * Server-side send throttle for transactional mail. Keyed on a hash rather than
 * the address itself so the table never holds a customer email, which also
 * keeps it out of backup dumps and ad-hoc queries.
 */
export const mailSendAttempts = pgTable(
  "mail_send_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    emailHash: text("email_hash").notNull(),
    windowStartedAt: timestamp("window_started_at").notNull(),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("mail_send_kind_email_window").on(
      table.kind,
      table.emailHash,
      table.windowStartedAt,
    ),
  ],
);

import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import { apiConfig } from "../src/config.js";
import {
  inventoryStock,
  products,
  type SizeMeasurement,
} from "../src/db/schema.js";

const config = apiConfig();
const deploySeed = process.argv.includes("--deploy");
if (config.APP_ENV !== "dev" && !deploySeed)
  throw new Error("Release catalog seed requires --deploy");
const pool = new pg.Pool({ connectionString: config.DATABASE_URL });
const db = drizzle(pool);
const sizes: SizeMeasurement[] = [
  { size: "S", chestCm: 96, lengthCm: 65, shoulderCm: 41 },
  { size: "M", chestCm: 102, lengthCm: 68, shoulderCm: 43 },
  { size: "L", chestCm: 108, lengthCm: 71, shoulderCm: 45 },
];
const data = [
  [
    "canvas-overshirt",
    "Canvas Overshirt",
    "Structured cotton layer with a relaxed collar.",
    "Overshirt",
    "Olive",
    7900,
  ],
  [
    "ribbed-knit-top",
    "Ribbed Knit Top",
    "Soft ribbed texture with a clean crew neck.",
    "Knitwear",
    "Sand",
    5400,
  ],
  [
    "linen-button-shirt",
    "Linen Button Shirt",
    "Airy woven shirt for warm days.",
    "Shirt",
    "Sky",
    6900,
  ],
  [
    "boxy-cotton-tee",
    "Boxy Cotton Tee",
    "Heavyweight everyday tee with an easy silhouette.",
    "T-shirt",
    "Rust",
    3900,
  ],
  [
    "studio-polo",
    "Studio Polo",
    "Classic collar and textured cotton finish.",
    "Polo",
    "Navy",
    5900,
  ],
  [
    "fleece-sweatshirt",
    "Fleece Sweatshirt",
    "Brushed inner finish and ribbed cuffs.",
    "Sweatshirt",
    "Heather",
    6500,
  ],
  [
    "cropped-denim-jacket",
    "Cropped Denim Jacket",
    "Durable denim layer with patch pockets.",
    "Jacket",
    "Indigo",
    9900,
  ],
  [
    "woven-camp-shirt",
    "Woven Camp Shirt",
    "Open collar and relaxed short sleeves.",
    "Shirt",
    "Coral",
    6200,
  ],
] as const;
try {
  for (const [slug, name, description, category, color, priceCents] of data) {
    const record = {
      slug,
      name,
      description,
      category,
      color,
      priceCents,
      imagePath: "/products/" + slug + "-v1.svg",
      sizes,
    };
    const insert = db.insert(products).values(record);
    if (deploySeed) {
      await insert.onConflictDoNothing({ target: products.slug });
    } else {
      await insert.onConflictDoUpdate({ target: products.slug, set: record });
    }
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);
    for (const size of sizes) {
      await db
        .insert(inventoryStock)
        .values({
          productId: product.id,
          size: size.size,
          available: 5,
          onHand: 5,
        })
        .onConflictDoNothing({
          target: [inventoryStock.productId, inventoryStock.size],
        });
    }
  }
  process.stdout.write("Catalog seed applied\n");
} finally {
  await pool.end();
}

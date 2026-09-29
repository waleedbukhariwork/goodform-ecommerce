ALTER TABLE "inventory_stock" ADD COLUMN "on_hand" integer;
--> statement-breakpoint
UPDATE "inventory_stock" AS stock
SET "on_hand" = stock."available" + COALESCE((
  SELECT SUM(item."quantity")::integer
  FROM "reservation_items" AS item
  JOIN "reservations" AS reservation ON reservation."id" = item."reservation_id"
  WHERE item."product_id" = stock."product_id"
    AND item."size" = stock."size"
    AND reservation."status" = 'active'
), 0);
--> statement-breakpoint
ALTER TABLE "inventory_stock" ALTER COLUMN "on_hand" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_on_hand_valid" CHECK ("inventory_stock"."on_hand" >= "inventory_stock"."available");

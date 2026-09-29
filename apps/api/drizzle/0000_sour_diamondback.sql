CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(60) NOT NULL,
	"color" varchar(60) NOT NULL,
	"price_cents" integer NOT NULL,
	"image_path" text NOT NULL,
	"sizes" jsonb NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "price_cents_nonnegative" CHECK ("products"."price_cents" >= 0)
);

CREATE TABLE "checkout_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"idempotency_key" varchar(100) NOT NULL,
	"reservation_id" uuid NOT NULL,
	"order_id" uuid,
	"stripe_session_id" text,
	"checkout_url" text,
	"status" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_attempts_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "checkout_attempts_stripe_session_id_unique" UNIQUE("stripe_session_id"),
	CONSTRAINT "checkout_attempt_status_valid" CHECK ("checkout_attempts"."status" IN ('started', 'ready', 'uncertain'))
);
--> statement-breakpoint
CREATE TABLE "checkout_rate_limits" (
	"user_id" text PRIMARY KEY NOT NULL,
	"window_start" timestamp NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "checkout_rate_count_positive" CHECK ("checkout_rate_limits"."count" >= 1)
);
--> statement-breakpoint
CREATE TABLE "processed_stripe_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_rate_limits" ADD CONSTRAINT "checkout_rate_limits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_user_key" ON "checkout_attempts" USING btree ("user_id","idempotency_key");
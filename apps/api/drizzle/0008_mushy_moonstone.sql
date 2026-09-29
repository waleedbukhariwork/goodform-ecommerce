CREATE TABLE "mail_send_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"email_hash" text NOT NULL,
	"window_started_at" timestamp NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mail_send_kind_email_window" ON "mail_send_attempts" USING btree ("kind","email_hash","window_started_at");
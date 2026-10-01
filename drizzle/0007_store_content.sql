ALTER TABLE "store_setting" ADD COLUMN "logo_url" text;
--> statement-breakpoint
ALTER TABLE "store_setting" ADD COLUMN "contact_email" text;
--> statement-breakpoint
ALTER TABLE "store_setting" ADD COLUMN "contact_phone" text;
--> statement-breakpoint
ALTER TABLE "content_page" ADD COLUMN "approved_at" timestamp with time zone;

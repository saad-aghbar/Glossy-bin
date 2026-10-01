ALTER TABLE "customer_order" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customer_order" ADD COLUMN "paid_by_user_id" text;--> statement-breakpoint
ALTER TABLE "customer_order" ADD CONSTRAINT "customer_order_paid_by_user_id_user_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
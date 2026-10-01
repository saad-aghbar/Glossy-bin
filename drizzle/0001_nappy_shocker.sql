ALTER TABLE "customer_order" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "customer_order" ADD CONSTRAINT "customer_order_idempotency_key_unique" UNIQUE("idempotency_key");
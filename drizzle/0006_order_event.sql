CREATE TABLE "order_event" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"actor_user_id" text,
	"kind" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_order_id_customer_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."customer_order"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "order_event_order_idx" ON "order_event" USING btree ("order_id");

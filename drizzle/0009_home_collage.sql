CREATE TABLE "home_collage_tile" (
	"id" text PRIMARY KEY NOT NULL,
	"slot" integer NOT NULL,
	"image_url" text NOT NULL,
	"target_kind" text NOT NULL,
	"target_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "home_collage_tile_slot_unique" UNIQUE("slot")
);

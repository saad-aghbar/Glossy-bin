CREATE TABLE "home_ribbon" (
	"id" text PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"link_url" text,
	"button_label" text DEFAULT 'شاهدي' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "clicks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"url_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "urls" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"original_url" text NOT NULL,
	"short_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "clicks_url_id_created_at_idx" ON "clicks" ("url_id","created_at");--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_url_id_urls_id_fkey" FOREIGN KEY ("url_id") REFERENCES "urls"("id") ON DELETE CASCADE;
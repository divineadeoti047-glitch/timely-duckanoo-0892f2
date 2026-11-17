CREATE TABLE "daystar_browser_backups" (
	"owner_hash" text PRIMARY KEY,
	"payload" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

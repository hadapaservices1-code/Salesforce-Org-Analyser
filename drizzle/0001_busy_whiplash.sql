CREATE INDEX IF NOT EXISTS "orgs_org_id_idx" ON "orgs" ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orgs_user_id_idx" ON "orgs" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scans_org_id_idx" ON "scans" ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scans_created_at_idx" ON "scans" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
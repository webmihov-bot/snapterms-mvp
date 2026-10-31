-- Row Level Security. The app server connects as the table owner (bypasses RLS);
-- these policies lock down the public Supabase REST/anon API so a browser can only read its own rows.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "flags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "credits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fetches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_free_reports_range" CHECK ("free_reports_used" BETWEEN 0 AND 3);--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uid') THEN
    EXECUTE 'ALTER TABLE "users" ADD CONSTRAINT "users_auth_fk" FOREIGN KEY ("id") REFERENCES auth.users(id) ON DELETE CASCADE';
    EXECUTE 'CREATE POLICY "users_self_read" ON "users" FOR SELECT TO authenticated USING (id = auth.uid())';
    EXECUTE 'CREATE POLICY "reports_owner_read" ON "reports" FOR SELECT TO authenticated USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "flags_owner_read" ON "flags" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM reports r WHERE r.id = report_id AND r.user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "credits_owner_read" ON "credits" FOR SELECT TO authenticated USING (user_id = auth.uid())';
    -- fetches: no policy => no anon/authenticated access at all
  END IF;
END $$;

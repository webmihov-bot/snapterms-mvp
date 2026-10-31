CREATE TYPE "public"."doc_role" AS ENUM('main', 'bonus');--> statement-breakpoint
CREATE TYPE "public"."fetch_status" AS ENUM('ok', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."paid_with" AS ENUM('free', 'credit');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TABLE "credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_session_id" text NOT NULL,
	"stripe_payment_intent" text,
	"seq" smallint NOT NULL,
	"pack" smallint NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consumed_at" timestamp with time zone,
	"consumed_report_id" uuid,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fetches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url_norm" text NOT NULL,
	"final_url" text,
	"ip_hash" char(64) NOT NULL,
	"user_id" uuid,
	"status" "fetch_status" NOT NULL,
	"http_status" smallint,
	"reason" text,
	"content_hash" char(64),
	"text" text,
	"chars" integer DEFAULT 0 NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"flag_id" text NOT NULL,
	"severity" "severity" NOT NULL,
	"quote" text NOT NULL,
	"clause_ref" text,
	"doc_role" "doc_role" NOT NULL,
	"sort" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"hostname" text NOT NULL,
	"main_url" text,
	"bonus_url" text,
	"main_hash" char(64),
	"bonus_hash" char(64),
	"prompt_version" text NOT NULL,
	"documents" jsonb NOT NULL,
	"extraction" jsonb NOT NULL,
	"conflicts" jsonb NOT NULL,
	"money" jsonb NOT NULL,
	"scores" jsonb NOT NULL,
	"coverage" smallint NOT NULL,
	"paid_with" "paid_with" NOT NULL,
	"credit_id" uuid,
	"parent_report_id" uuid,
	"changed_fields" jsonb,
	"meta" jsonb NOT NULL,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"age_confirmed_at" timestamp with time zone,
	"free_reports_used" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flags" ADD CONSTRAINT "flags_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_credit_id_credits_id_fk" FOREIGN KEY ("credit_id") REFERENCES "public"."credits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credits_session_seq_uq" ON "credits" USING btree ("stripe_session_id","seq");--> statement-breakpoint
CREATE INDEX "credits_user_open_idx" ON "credits" USING btree ("user_id") WHERE consumed_at is null and revoked_at is null;--> statement-breakpoint
CREATE INDEX "credits_pi_idx" ON "credits" USING btree ("stripe_payment_intent");--> statement-breakpoint
CREATE INDEX "fetches_url_idx" ON "fetches" USING btree ("url_norm","fetched_at");--> statement-breakpoint
CREATE INDEX "fetches_ip_idx" ON "fetches" USING btree ("ip_hash","fetched_at");--> statement-breakpoint
CREATE INDEX "flags_report_idx" ON "flags" USING btree ("report_id","sort");--> statement-breakpoint
CREATE INDEX "reports_user_created_idx" ON "reports" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "reports_user_host_idx" ON "reports" USING btree ("user_id","hostname");--> statement-breakpoint
CREATE INDEX "reports_hash_idx" ON "reports" USING btree ("main_hash","bonus_hash","prompt_version","created_at");
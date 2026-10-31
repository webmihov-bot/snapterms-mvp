import { sql } from "drizzle-orm";
import { char, index, integer, jsonb, pgEnum, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Conflict, DocumentMeta, MergedExtraction, ReportMeta } from "@/lib/schema/extraction";
import type { Money as MoneyMath, Scores, ChangedField } from "@/lib/pipeline/types";

export const paidWith = pgEnum("paid_with", ["free", "credit"]);
export const severityEnum = pgEnum("severity", ["low", "medium", "high"]);
export const docRoleEnum = pgEnum("doc_role", ["main", "bonus"]);
export const fetchStatus = pgEnum("fetch_status", ["ok", "blocked"]);

/** 1:1 with auth.users (FK added in the RLS migration). */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  ageConfirmedAt: timestamp("age_confirmed_at", { withTimezone: true }),
  freeReportsUsed: smallint("free_reports_used").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const credits = pgTable(
  "credits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stripeSessionId: text("stripe_session_id").notNull(),
    stripePaymentIntent: text("stripe_payment_intent"),
    seq: smallint("seq").notNull(),
    pack: smallint("pack").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    consumedReportId: uuid("consumed_report_id"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("credits_session_seq_uq").on(t.stripeSessionId, t.seq),
    index("credits_user_open_idx").on(t.userId).where(sql`consumed_at is null and revoked_at is null`),
    index("credits_pi_idx").on(t.stripePaymentIntent),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    hostname: text("hostname").notNull(),
    mainUrl: text("main_url"),
    bonusUrl: text("bonus_url"),
    mainHash: char("main_hash", { length: 64 }),
    bonusHash: char("bonus_hash", { length: 64 }),
    promptVersion: text("prompt_version").notNull(),
    documents: jsonb("documents").$type<DocumentMeta[]>().notNull(),
    extraction: jsonb("extraction").$type<MergedExtraction>().notNull(),
    conflicts: jsonb("conflicts").$type<Conflict[]>().notNull(),
    money: jsonb("money").$type<MoneyMath>().notNull(),
    scores: jsonb("scores").$type<Scores>().notNull(),
    coverage: smallint("coverage").notNull(),
    paidWith: paidWith("paid_with").notNull(),
    creditId: uuid("credit_id").references(() => credits.id),
    parentReportId: uuid("parent_report_id"),
    changedFields: jsonb("changed_fields").$type<ChangedField[]>(),
    meta: jsonb("meta").$type<ReportMeta>().notNull(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reports_user_created_idx").on(t.userId, t.createdAt),
    index("reports_user_host_idx").on(t.userId, t.hostname),
    index("reports_hash_idx").on(t.mainHash, t.bonusHash, t.promptVersion, t.createdAt),
  ],
);

export const flags = pgTable(
  "flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    flagId: text("flag_id").notNull(),
    severity: severityEnum("severity").notNull(),
    quote: text("quote").notNull(),
    clauseRef: text("clause_ref"),
    docRole: docRoleEnum("doc_role").notNull(),
    sort: smallint("sort").notNull(),
  },
  (t) => [index("flags_report_idx").on(t.reportId, t.sort)],
);

/** Fetch cache (7 days) and outbound-fetch log for the per-IP limit. */
export const fetches = pgTable(
  "fetches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    urlNorm: text("url_norm").notNull(),
    finalUrl: text("final_url"),
    ipHash: char("ip_hash", { length: 64 }).notNull(),
    userId: uuid("user_id"),
    status: fetchStatus("status").notNull(),
    httpStatus: smallint("http_status"),
    reason: text("reason"),
    contentHash: char("content_hash", { length: 64 }),
    text: text("text"),
    chars: integer("chars").notNull().default(0),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("fetches_url_idx").on(t.urlNorm, t.fetchedAt), index("fetches_ip_idx").on(t.ipHash, t.fetchedAt)],
);

export type UserRow = typeof users.$inferSelect;
export type ReportRow = typeof reports.$inferSelect;
export type FlagRow = typeof flags.$inferSelect;
export type CreditRow = typeof credits.$inferSelect;

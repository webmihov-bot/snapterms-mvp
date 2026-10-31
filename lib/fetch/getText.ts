import { createHash } from "node:crypto";
import type { DocRole, DocumentMeta, SourceType } from "@/lib/schema/extraction";
import { cleanHtml, cleanPlainText } from "./clean";
import { blockedStatus, classify, classifyText, type BlockReason } from "./detect";
import { safeFetch, TooLargeError, UnsafeHostError } from "./safeFetch";

export const MAX_TEXT_CHARS = 200_000;

export type DocInput =
  | { role: DocRole; kind: "url"; url: string }
  | { role: DocRole; kind: "text"; text: string; sourceType: Exclude<SourceType, "url">; filename: string | null };

export interface ReadDoc {
  meta: DocumentMeta;
  text: string | null;
}

export interface FetchStore {
  getCached(urlNorm: string): Promise<{ text: string; contentHash: string; fetchedAt: Date; finalUrl: string | null } | null>;
  record(row: {
    urlNorm: string;
    finalUrl: string | null;
    status: "ok" | "blocked";
    httpStatus: number | null;
    reason: BlockReason | null;
    contentHash: string | null;
    text: string | null;
  }): Promise<void>;
}

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export interface FetchedPage {
  ok: boolean;
  reason: BlockReason | null;
  httpStatus: number | null;
  finalUrl: string | null;
  text: string | null;
}

/** Network + classification only. Never launches a browser. */
export async function fetchPage(url: string): Promise<FetchedPage> {
  let res;
  try {
    res = await safeFetch(url);
  } catch (err) {
    const reason: BlockReason =
      err instanceof UnsafeHostError
        ? "unsafe_host"
        : err instanceof TooLargeError
          ? "too_large"
          : err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")
            ? "timeout"
            : "network";
    return { ok: false, reason, httpStatus: null, finalUrl: null, text: null };
  }
  if (blockedStatus(res.status) || res.status >= 400) {
    return { ok: false, reason: "http_status", httpStatus: res.status, finalUrl: res.finalUrl, text: null };
  }
  const ct = res.contentType.toLowerCase();
  let text: string;
  let reason: BlockReason | null;
  if (ct.includes("text/plain") || ct.includes("text/markdown")) {
    text = cleanPlainText(res.body);
    reason = classifyText(text);
  } else if (ct.includes("html") || ct === "") {
    const cleaned = cleanHtml(res.body);
    text = cleaned.text;
    reason = classify(res.body, text, cleaned.scriptCount);
  } else {
    return { ok: false, reason: "not_html", httpStatus: res.status, finalUrl: res.finalUrl, text: null };
  }
  if (reason) return { ok: false, reason, httpStatus: res.status, finalUrl: res.finalUrl, text: null };
  return { ok: true, reason: null, httpStatus: res.status, finalUrl: res.finalUrl, text: text.slice(0, MAX_TEXT_CHARS) };
}

const CACHE_HIT = Symbol("cache");

export async function getText(input: DocInput, store: FetchStore, opts: { bypassCache?: boolean } = {}): Promise<ReadDoc> {
  const now = new Date().toISOString();
  if (input.kind === "text") {
    const text = cleanPlainText(input.text).slice(0, MAX_TEXT_CHARS);
    const reason = classifyText(text);
    return {
      text: reason ? null : text,
      meta: {
        role: input.role,
        sourceType: input.sourceType,
        url: null,
        filename: input.filename,
        fetchedAt: now,
        contentHash: reason ? null : sha256(text),
        chars: text.length,
        status: reason ? "blocked" : "read",
        reason,
      },
    };
  }

  const cached = opts.bypassCache ? null : await store.getCached(input.url);
  const page: FetchedPage | typeof CACHE_HIT = cached ? CACHE_HIT : await fetchPage(input.url);

  if (page === CACHE_HIT && cached) {
    return {
      text: cached.text,
      meta: {
        role: input.role,
        sourceType: "url",
        url: input.url,
        filename: null,
        fetchedAt: cached.fetchedAt.toISOString(),
        contentHash: cached.contentHash,
        chars: cached.text.length,
        status: "read",
        reason: null,
      },
    };
  }

  const p = page as FetchedPage;
  const contentHash = p.text ? sha256(p.text) : null;
  await store.record({
    urlNorm: input.url,
    finalUrl: p.finalUrl,
    status: p.ok ? "ok" : "blocked",
    httpStatus: p.httpStatus,
    reason: p.reason,
    contentHash,
    text: p.text,
  });
  return {
    text: p.text,
    meta: {
      role: input.role,
      sourceType: "url",
      url: input.url,
      filename: null,
      fetchedAt: now,
      contentHash,
      chars: p.text?.length ?? 0,
      status: p.ok ? "read" : "blocked",
      reason: p.reason,
    },
  };
}

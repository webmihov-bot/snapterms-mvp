import { describe, expect, it } from "vitest";
import { normalizePair, normalizeUrl } from "@/lib/url/normalize";

describe("normalizeUrl", () => {
  it("trims, prepends https and strips the fragment", () => {
    expect(normalizeUrl("  example.com/en/terms#bonus ")).toEqual({ ok: true, url: "https://example.com/en/terms", hostname: "example.com" });
  });
  it("keeps an explicit http scheme", () => {
    expect(normalizeUrl("http://example.com/t")).toMatchObject({ ok: true, url: "http://example.com/t" });
  });
  it.each([
    ["", "empty"],
    ["ftp://example.com/x", "scheme"],
    ["javascript:alert(1)", "scheme"],
    ["https://127.0.0.1/terms", "ip_literal"],
    ["https://[::1]/terms", "ip_literal"],
    ["https://2130706433/", "ip_literal"],
    ["http://localhost:3000/terms", "localhost"],
    ["https://intranet/terms", "localhost"],
    ["https://box.internal/terms", "localhost"],
    [`https://example.com/${"a".repeat(2050)}`, "too_long"],
    ["https://user:pass@example.com/", "invalid"],
  ])("rejects %s", (input, error) => {
    expect(normalizeUrl(input)).toEqual({ ok: false, error });
  });
  it("rejects the same URL in both fields", () => {
    const r = normalizePair("example.com/terms", "https://example.com/terms#x");
    expect(r.bonus).toEqual({ ok: false, error: "same_url" });
  });
  it("treats an empty bonus field as absent", () => {
    expect(normalizePair("example.com/terms", "  ").bonus).toBeNull();
  });
});

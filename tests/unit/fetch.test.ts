import { describe, expect, it } from "vitest";
import { cleanHtml } from "@/lib/fetch/clean";
import { classify } from "@/lib/fetch/detect";
import { getText, type FetchStore } from "@/lib/fetch/getText";
import { isPrivateAddress } from "@/lib/fetch/safeFetch";
import { truncateClauses } from "@/lib/llm/truncate";
import { fixture } from "../helpers";

const terms = Array.from({ length: 30 }, (_, i) => `<h3>${i + 1}. Section ${i + 1}</h3><p>Withdrawals and bonus wagering rules for section ${i + 1} apply to all players.</p>`).join("");

describe("cleanHtml + classify", () => {
  it("strips nav/script/footer and keeps numbered headings on their own lines", () => {
    const html = `<html><head><title>T</title><script>var x</script></head><body><nav>Menu</nav><main>${terms}</main><footer>Footer</footer></body></html>`;
    const r = cleanHtml(html);
    expect(r.text).not.toContain("Menu");
    expect(r.text).not.toContain("Footer");
    expect(r.text).toMatch(/^7\. Section 7$/m);
    expect(classify(html, r.text, r.scriptCount)).toBeNull();
  });
  it("detects a Cloudflare interstitial", () => {
    const html = `<html><head><title>Just a moment...</title></head><body><div id="cf-challenge">Checking your browser</div><script src="/cdn-cgi/challenge-platform/x.js"></script></body></html>`;
    const r = cleanHtml(html);
    expect(classify(html, r.text, r.scriptCount)).toBe("interstitial");
  });
  it("detects a JS shell", () => {
    const html = `<html><body><div id="root"></div><script src="/app.js"></script></body></html>`;
    const r = cleanHtml(html);
    expect(classify(html, r.text, r.scriptCount)).toBe("js_shell");
  });
  it("marks pages under 400 visible chars as too short", () => {
    const html = `<html><body><p>Terms coming soon.</p></body></html>`;
    expect(classify(html, cleanHtml(html).text, 0)).toBe("too_short");
  });
});

describe("getText", () => {
  const store: FetchStore = { getCached: async () => null, record: async () => {} };
  it("pasted text is hashed and read without any fetch", async () => {
    const r = await getText({ role: "bonus", kind: "text", text: fixture("conflict-pair/bonus.md"), sourceType: "file", filename: "bonus.md" }, store);
    expect(r.meta.status).toBe("read");
    expect(r.meta.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.meta.filename).toBe("bonus.md");
  });
  it("short pasted text is blocked, not read", async () => {
    const r = await getText({ role: "main", kind: "text", text: "too short", sourceType: "paste", filename: null }, store);
    expect(r.meta.status).toBe("blocked");
    expect(r.text).toBeNull();
  });
  it("uses the cache and never touches the network on a hit", async () => {
    const cached: FetchStore = { getCached: async () => ({ text: "x".repeat(500), contentHash: "a".repeat(64), fetchedAt: new Date(), finalUrl: null }), record: async () => { throw new Error("no fetch"); } };
    const r = await getText({ role: "main", kind: "url", url: "https://example.com/terms" }, cached);
    expect(r.meta.contentHash).toBe("a".repeat(64));
  });
});

describe("private address guard", () => {
  it.each([
    ["10.0.0.1", 4, true],
    ["172.20.1.1", 4, true],
    ["192.168.1.1", 4, true],
    ["169.254.169.254", 4, true],
    ["127.0.0.1", 4, true],
    ["8.8.8.8", 4, false],
    ["::1", 6, true],
    ["fd00::1", 6, true],
    ["::ffff:10.0.0.1", 6, true],
    ["2606:4700::1111", 6, false],
  ])("%s -> %s", (ip, fam, expected) => {
    expect(isPrivateAddress(ip, fam)).toBe(expected);
  });
});

describe("truncateClauses", () => {
  it("keeps whole clauses, prefers bonus/withdrawal clauses, respects the cap", () => {
    const filler = Array.from({ length: 200 }, (_, i) => `${i + 10}. General\nThe weather in the lobby is pleasant and the carpets are clean.`).join("\n\n");
    const text = `${fixture("conflict-pair/bonus.md")}\n\n${filler}`;
    const r = truncateClauses(text, 3000);
    expect(r.truncated).toBe(true);
    expect(r.text.length).toBeLessThanOrEqual(3000);
    expect(r.text).toContain("wagered 35 times");
  });
});

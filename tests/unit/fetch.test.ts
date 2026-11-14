import { describe, expect, it } from "vitest";
import { cleanHtml, joinClauseNumbers } from "@/lib/fetch/clean";
import { netlifyCountry } from "@/lib/auth/signedIn";
import { classify } from "@/lib/fetch/detect";
import { clientIp } from "@/lib/fetch/store";
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

describe("real-world page shapes", () => {
  it("keeps the text of collapsed accordions (hidden / aria-hidden)", () => {
    const html = `<html><body><main><h2>Bonus</h2><div hidden><p>The bonus must be wagered 35 times.</p></div><div aria-hidden="true"><p>Maximum bet is 5 EUR.</p></div></main></body></html>`;
    const t = cleanHtml(html).text;
    expect(t).toContain("wagered 35 times");
    expect(t).toContain("Maximum bet is 5 EUR");
  });
  it("joins clause numbers that sit in their own element to the heading", () => {
    const html = `<html><body><ol><li><span>7.3</span><div><p>Withdrawals are processed within 3 days.</p></div></li></ol></body></html>`;
    expect(cleanHtml(html).text).toBe("7.3 Withdrawals are processed within 3 days.");
    const lines = (...l: string[]) => l.join(String.fromCharCode(10));
    expect(joinClauseNumbers(lines("Section 12", "", "Bonuses", "", "Text 2024", "more"))).toBe(lines("Section 12 Bonuses", "", "Text 2024", "more"));
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

describe("host headers", () => {
  it("reads the visitor country from Netlify's x-nf-geo header", () => {
    const header = Buffer.from(JSON.stringify({ city: "London", country: { code: "GB", name: "United Kingdom" } })).toString("base64");
    expect(netlifyCountry(header)).toBe("GB");
    expect(netlifyCountry("not-base64-json")).toBeNull();
    expect(netlifyCountry(null)).toBeNull();
  });
  it("trusts Netlify's client IP header only when running on Netlify", () => {
    const both = new Headers({ "x-nf-client-connection-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" });
    expect(clientIp(both)).toBe("198.51.100.1");
    process.env.NETLIFY = "true";
    expect(clientIp(both)).toBe("203.0.113.7");
    delete process.env.NETLIFY;
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe("198.51.100.1");
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

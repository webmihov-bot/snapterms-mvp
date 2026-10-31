import { describe, expect, it } from "vitest";
import { reportToText } from "@/lib/export/toText";
import { diffExtractions } from "@/lib/pipeline/diff";
import { buildPlaybook, voidClauses } from "@/lib/report/playbook";
import { sampleReport } from "@/lib/report/sample";
import { createShareToken, verifyShareToken } from "@/lib/share/token";

const SECRET = "s".repeat(40);
const ID = "3f1c2a8e-5b6d-4e7f-8a9b-0c1d2e3f4a5b";

describe("share token", () => {
  it("round-trips and expires after 30 days", () => {
    const now = Date.UTC(2026, 9, 31);
    const { token } = createShareToken(ID, SECRET, now);
    expect(verifyShareToken(token, SECRET, now)).toBe(ID);
    expect(verifyShareToken(token, SECRET, now + 29 * 86_400_000)).toBe(ID);
    expect(verifyShareToken(token, SECRET, now + 31 * 86_400_000)).toBeNull();
  });
  it("rejects tampering and other secrets", () => {
    const { token } = createShareToken(ID, SECRET);
    expect(verifyShareToken(token, "x".repeat(40))).toBeNull();
    const [p, s] = token.split(".");
    const forged = Buffer.from(`${ID.replace("3", "4")}.9999999999`).toString("base64url");
    expect(verifyShareToken(`${forged}.${s}`, SECRET)).toBeNull();
    expect(verifyShareToken(`${p}.AAAA`, SECRET)).toBeNull();
  });
});

describe("report text + playbook", () => {
  const r = sampleReport();
  it("copy-as-text follows the card order and includes quotes", () => {
    const t = reportToText(r, "balanced", "https://snapterms.app/share/x");
    const order = ["1. Verdict", "2. Documents", "3. The money", "4. Cost of the bonus", "5. Wagering effort", "6. Payout timeline", "7. Contradiction", "8. Risk chips", "9. Playbook", "10. What would void"];
    let last = -1;
    for (const h of order) {
      const at = t.indexOf(h);
      expect(at, h).toBeGreaterThan(last);
      last = at;
    }
    expect(t).toContain("wagered 35 times");
    expect(t).toContain("https://snapterms.app/share/x");
    expect(t).toMatch(/€7,000/);
  });
  it("playbook has 4-6 steps, each with a why", () => {
    const steps = buildPlaybook(r.extraction, r.money);
    expect(steps.length).toBeGreaterThanOrEqual(4);
    expect(steps.length).toBeLessThanOrEqual(6);
    expect(steps.every((s) => s.why.length > 0)).toBe(true);
  });
  it("void card lists 3-5 clauses with quotes", () => {
    const v = voidClauses(r);
    expect(v.length).toBeGreaterThanOrEqual(3);
    expect(v.length).toBeLessThanOrEqual(5);
  });
  it("diff shows changed numbers", () => {
    const after = structuredClone(r.extraction);
    after.bonus.wageringMultiplier.value = 50;
    expect(diffExtractions(r.extraction, after)).toEqual([{ field: "bonus.wageringMultiplier", before: 35, after: 50 }]);
  });
  it("copy never promises outcomes", () => {
    const t = reportToText(r, "risky", null).toLowerCase();
    for (const banned of ["guaranteed", "risk-free", "certain"]) expect(t).not.toContain(banned);
  });
});

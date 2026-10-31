import { COPY, fmtMoney } from "@/lib/copy";
import type { ProfileId } from "@/lib/pipeline/types";
import { buildPlaybook, voidClauses } from "@/lib/report/playbook";
import { fieldLabel, formatValue, getField, type ReportData } from "@/lib/report/view";

/** Flattens the card stack into plain text, same order as the report. */
export function reportToText(r: ReportData, profile: ProfileId, shareUrl: string | null): string {
  const R = COPY.report;
  const m = r.money;
  const p = r.scores.profiles[profile];
  const lines: string[] = [];
  const cur = m.currency;
  const x = r.extraction;

  lines.push(COPY.text.heading(r.hostname), R.created(new Date(r.createdAt).toISOString().slice(0, 10)), "");
  lines.push(`1. ${R.verdictTitle}`, COPY.text.score(p.overall, R.verdict[p.verdict], R.profiles[profile]), R.verdictLine[p.verdict]);
  lines.push(`   ${R.licenseChip(x.operator.regulator.value, x.operator.licenseTier)} · ${R.coverage[r.coverage] ?? ""}`, "");

  lines.push(`2. ${R.documents.title}`);
  for (const d of r.documents) {
    const role = d.role === "main" ? R.documents.roleMain : R.documents.roleBonus;
    const where = d.url ? new URL(d.url).hostname : d.filename ?? (d.sourceType ? R.documents.sourcePaste : R.documents.missing);
    lines.push(`   ${role}: ${where}${d.status === "read" ? ` · ${d.chars}` : ` · ${d.status === "blocked" ? R.documents.blocked : R.documents.missing}`}`);
  }
  lines.push("");

  lines.push(`3. ${R.money.title}`);
  lines.push(`   ${R.money.bonus}: ${fmtMoney(m.bonus, cur)}`);
  lines.push(`   ${R.money.turnover}: ${fmtMoney(m.turnover, cur)} (${R.money.fTurnover(m.wageringMultiplier, m.wageringBase)})`);
  lines.push(`   ${R.money.loss}: ${fmtMoney(m.expectedLoss, cur)} (${R.money.fLoss(m.houseEdge)})`);
  lines.push(`   ${R.money.ev}: ${fmtMoney(m.bonusEV, cur)} (${R.money.fEv})`);
  lines.push(`   ${R.money.line(m.bonusEV, cur)}`, "");

  lines.push(`4. ${R.cost.title}`, `   ${R.cost.caption(m.lossPer100, cur)}`, "");
  lines.push(`5. ${R.wagering.title}`, `   ${R.wagering.caption(m.betSize, m.spins, m.expiryDays, cur)}`, "");
  lines.push(`6. ${R.payout.title}`, `   ${R.payout.line(x.withdrawal.processingDays.value?.max ?? null)}`, "");

  if (r.conflicts.length) {
    lines.push(`7. ${R.contradiction.title}`);
    for (const c of r.conflicts) {
      lines.push(`   ${fieldLabel(c.field)}`);
      lines.push(`   ${R.contradiction.main}: ${formatValue(c.field, c.main.value)}${c.main.quote ? ` — "${c.main.quote}"` : ""}`);
      lines.push(`   ${R.contradiction.bonus}: ${formatValue(c.field, c.bonus.value)}${c.bonus.quote ? ` — "${c.bonus.quote}"` : ""}`);
    }
    lines.push(`   ${R.contradiction.trustBody}`, "");
  }

  lines.push(`8. ${R.risks.title}`);
  for (const f of r.flags.slice(0, 10)) lines.push(`   - ${COPY.flags[f.id].title}: ${COPY.flags[f.id].meaning}`);
  lines.push("");

  lines.push(`9. ${R.playbook.title}`);
  buildPlaybook(x, m).forEach((s, i) => lines.push(`   ${i + 1}. ${s.step} — ${s.why}${s.clauseRef ? ` (${R.playbook.clause(s.clauseRef)})` : ""}`));
  lines.push("");

  lines.push(`10. ${R.void.title}`);
  const voids = voidClauses(r);
  if (!voids.length) lines.push(`   ${R.void.none}`);
  for (const v of voids) lines.push(`   - ${COPY.flags[v.id].title}: "${v.quote}"${v.clauseRef ? ` (clause ${v.clauseRef})` : ""}`);
  lines.push("");

  for (const path of ["bonus.maxAmount", "bonus.wageringMultiplier", "bonus.maxBet", "bonus.maxWinCap"]) {
    const f = getField(x, path);
    if (f?.quote) lines.push(COPY.text.source(fieldLabel(path), f.quote, f.clauseRef));
  }
  lines.push("", `${R.footer.age} · ${R.footer.disclaimer}`, R.footer.verify);
  if (shareUrl) lines.push(COPY.text.link(shareUrl));
  return lines.join("\n");
}

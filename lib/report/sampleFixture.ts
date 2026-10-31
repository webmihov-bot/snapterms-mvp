import type { DocExtraction, Field } from "@/lib/schema/extraction";

/**
 * Extraction of the fictional "Northbridge Casino" fixture (tests/fixtures/conflict-pair).
 * Used for unit tests and the landing-page sample, which is labelled illustrative.
 */
function F<T>(value: T, quote: string, clauseRef: string | null): Field<T> {
  return { value, quote, clauseRef, confidence: 1, reason: null };
}
const N: Field<never> = { value: null, quote: null, clauseRef: null, confidence: 0, reason: "not_found" };

const eur = (amount: number) => ({ amount, currency: "EUR" });

export const SAMPLE_MAIN: DocExtraction = {
  operator: {
    name: F("Northbridge Gaming Ltd", "These terms apply to every account at northbridge.example, operated by Northbridge Gaming Ltd.", null),
    domain: F("northbridge.example", "These terms apply to every account at northbridge.example, operated by Northbridge Gaming Ltd.", null),
    regulator: F("Malta Gaming Authority", "Northbridge Gaming Ltd is licensed and regulated by the Malta Gaming Authority under licence number MGA/B2C/000/2020.", null),
    licenseNumber: F("MGA/B2C/000/2020", "Northbridge Gaming Ltd is licensed and regulated by the Malta Gaming Authority under licence number MGA/B2C/000/2020.", null),
  },
  withdrawal: {
    minAmount: F(eur(20), "The minimum withdrawal amount is €20.", "3.1"),
    feePercent: N,
    feeCondition: N,
    processingDays: F({ min: 3, max: 5 }, "Withdrawals are processed within 3 to 5 business days after approval.", "3.2"),
    splitPayouts: F({ limit: eur(5000), period: "month" as const }, "Winnings above €5,000 will be paid in monthly instalments of €5,000.", "3.5"),
    sameMethodRequired: F(true, "Withdrawals must be made to the same payment method used to deposit, where possible.", "3.4"),
    kycRequired: F("on_withdrawal" as const, "We will verify your identity before your first withdrawal is paid.", "3.3"),
  },
  bonus: {
    maxAmount: N,
    percent: N,
    minDeposit: F(eur(20), "The minimum deposit is €20.", "2.1"),
    wageringMultiplier: F(40, "Unless the promotion terms say otherwise, all bonuses must be wagered 40 times the bonus amount before winnings can be withdrawn.", "4.1"),
    wageringBase: F("bonus" as const, "Unless the promotion terms say otherwise, all bonuses must be wagered 40 times the bonus amount before winnings can be withdrawn.", "4.1"),
    maxBet: N,
    slotsContribution: N,
    liveContribution: N,
    excludedGamesCount: N,
    expiryDays: N,
    maxWinCap: N,
    cashFirst: N,
    forfeitOnWithdrawal: N,
    maxWinNoDeposit: N,
  },
  flags: [
    { id: "void_multiple_accounts", severity: "high", quote: "Opening more than one account per person, household or IP address will result in all accounts being closed and all winnings being voided.", clauseRef: "1.2" },
    { id: "void_vpn", severity: "high", quote: "Using a VPN, proxy or any other means to mask your location is not permitted and any balance obtained this way will be forfeited.", clauseRef: "1.3" },
    { id: "void_chargeback", severity: "medium", quote: "Chargebacks or payment reversals will result in the account being closed and the remaining balance being withheld.", clauseRef: "2.2" },
    { id: "confiscation_discretion", severity: "high", quote: "We reserve the right to withhold any winnings at our sole discretion where we suspect irregular play.", clauseRef: "4.2" },
    { id: "void_irregular_play", severity: "medium", quote: "Betting patterns that place opposite bets on the same outcome, or low-risk betting to complete wagering, are considered irregular play and will void the bonus and associated winnings.", clauseRef: "4.3" },
  ],
};

export const SAMPLE_BONUS: DocExtraction = {
  operator: { name: N, domain: N, regulator: N, licenseNumber: N },
  withdrawal: { minAmount: N, feePercent: N, feeCondition: N, processingDays: N, splitPayouts: N, sameMethodRequired: N, kycRequired: N },
  bonus: {
    maxAmount: F(eur(200), "New players receive a 100% match bonus on their first deposit up to €200.", "1.1"),
    percent: F(100, "New players receive a 100% match bonus on their first deposit up to €200.", "1.1"),
    minDeposit: F(eur(20), "The minimum qualifying deposit is €20.", "1.2"),
    wageringMultiplier: F(35, "The bonus amount must be wagered 35 times before it can be converted into withdrawable cash.", "2.1"),
    wageringBase: F("bonus" as const, "The bonus amount must be wagered 35 times before it can be converted into withdrawable cash.", "2.1"),
    maxBet: F(eur(5), "While a bonus is active the maximum bet is €5 per spin or round.", "3.1"),
    slotsContribution: F(100, "Slots contribute 100% to the wagering requirement.", "2.3"),
    liveContribution: F(10, "Live casino games contribute 10%.", "2.3"),
    excludedGamesCount: F(42, "A list of 42 excluded games is published on the promotions page.", "2.4"),
    expiryDays: F(7, "You have 7 days from the moment the bonus is credited to complete the wagering requirement.", "2.2"),
    maxWinCap: F({ kind: "fixed" as const, amount: eur(1000), of: null, x: null }, "The maximum amount you can withdraw from bonus winnings is €1,000.", "3.3"),
    cashFirst: F(true, "Your real money balance is always used before your bonus balance.", "3.2"),
    forfeitOnWithdrawal: F(true, "If you request a withdrawal before the wagering requirement is complete, the bonus and all winnings from it will be forfeited.", "3.4"),
    maxWinNoDeposit: N,
  },
  flags: [{ id: "void_bonus_abuse", severity: "medium", quote: "Northbridge may cancel any bonus where it considers the offer has been abused.", clauseRef: "3.5" }],
};

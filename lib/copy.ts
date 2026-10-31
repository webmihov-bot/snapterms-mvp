/**
 * Every user-facing string in SnapTerms. English only.
 * Rules: second person, verb-first, one idea per sentence, all money with currency.
 * Never: "win guaranteed", "certain", "risk-free".
 */
import type { FlagId } from "@/lib/schema/extraction";
import type { ProfileId, Verdict } from "@/lib/pipeline/types";

export const BRAND = "SnapTerms" as const;

/* ---------------- Formatting ---------------- */

export function fmtMoney(amount: number | null | undefined, currency = "EUR", digits?: number): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "—";
  const d = digits ?? (Math.abs(amount) >= 1000 || Number.isInteger(amount) ? 0 : 2);
  try {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency, minimumFractionDigits: d, maximumFractionDigits: d }).format(amount);
  } catch {
    return `${amount.toFixed(d)} ${currency}`;
  }
}

export function fmtNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IE", { maximumFractionDigits: 1 }).format(n);
}

export function fmtDate(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function fmtChars(n: number): string {
  return `${new Intl.NumberFormat("en-IE").format(n)} characters`;
}

/* ---------------- Global ---------------- */

export const COPY = {
  meta: {
    title: "SnapTerms — see what a casino bonus costs before you deposit",
    description: "Paste the casino terms and bonus terms links. Get the real cost of the bonus in four numbers, with a quote behind every one.",
  },
  nav: {
    myReports: "My reports",
    signIn: "Sign in",
    account: "Account",
    analyse: "Analyse",
    skip: "Skip to content",
    home: "SnapTerms home",
  },
  footer: {
    legal: "Legal",
    terms: "Terms of use",
    privacy: "Privacy",
    rg: "Responsible gambling",
    pricing: "Pricing",
    disclaimer: "Informational only, not legal advice. 18+ only.",
    rgTitle: "Gambling should stay fun.",
    rgBody: "If it stops being fun, free and confidential help is available.",
    rgCta: "Find help near you",
    copyright: (year: number) => `© ${year} SnapTerms`,
  },

  /* ---------------- Landing ---------------- */
  landing: {
    h1: "See what it costs before you deposit.",
    sub1: "Paste the general terms link and the bonus terms link.",
    sub2: "Get four numbers out: bonus, turnover, expected loss and what it is really worth.",
    cta: "Analyse the terms",
    sample: "See a sample report",
    sampleCaption: (seconds: number | null) => (seconds ? `Sample report, ${seconds} seconds` : "Sample report"),
    sampleIllustrative: "Illustrative sample built from fictional terms. Your report quotes the real casino's text.",
    howTitle: "How it works",
    how: [
      { title: "Paste two links", body: "Add the general terms and the separate bonus terms page." },
      { title: "We read both", body: "Every number is pulled out with the sentence that states it." },
      { title: "See the cost", body: "Get a verdict, the money math and a playbook in one scroll." },
    ],
    howLinkMain: "casino.com/terms",
    howLinkBonus: "casino.com/bonus-terms",
    howArrow: "4 numbers",
    getTitle: "What you get",
    get: [
      { title: "The money", body: "Bonus, required turnover, expected loss and expected value, each with its formula." },
      { title: "Cost of the bonus", body: "See how much you lose for every €100 of bonus." },
      { title: "Payout timeline", body: "Know how many days each step of a withdrawal takes." },
      { title: "Contradictions", body: "Spot when the two documents state different numbers." },
      { title: "Risk chips", body: "Find the max bet, winnings cap and cash-first rules at a glance." },
      { title: "Playbook", body: "Follow numbered steps that keep your balance safe, with clause references." },
    ],
    pricingTitle: "Pricing",
    faqTitle: "Questions",
    faq: [
      {
        q: "Why two links?",
        a: "Casinos usually keep bonus rules in a separate document. That is where the wagering numbers live. With only the general terms, your report shows what it can and marks the rest as not found.",
      },
      {
        q: "What if the casino site blocks you?",
        a: "Some sites block automated reading. When that happens we tell you which document was blocked and you can paste its text or upload a .txt or .md file. A blocked fetch never uses a report.",
      },
      {
        q: "Where do the numbers come from?",
        a: "Only from the documents you give us. Each number links to the sentence it came from. If we cannot quote it, we do not show it.",
      },
      {
        q: "What do you not do?",
        a: "We do not give legal advice, predict results or help you get around casino rules. We explain what the terms say and what they cost.",
      },
      {
        q: "How does payment work?",
        a: "Your first 3 reports are free. After that you buy credits through Stripe: €3.90 for one report or €9.90 for three. No subscription.",
      },
      {
        q: "Can I get a refund?",
        a: "Unused credits are refundable within 14 days. Email us and we refund through Stripe. A report that fails to complete never uses a credit.",
      },
    ],
  },

  /* ---------------- Pricing ---------------- */
  pricing: {
    title: "Pricing",
    lead: "Pay per report. No subscription.",
    freeTitle: "Free",
    freePrice: "€0",
    freeBody: "3 complete reports per account.",
    oneTitle: "1 report",
    onePrice: "€3.90",
    oneBody: "One credit, one complete report.",
    threeTitle: "3 reports",
    threePrice: "€9.90",
    threeBody: "Three credits. €3.30 per report.",
    compareRow: "Every report is complete. Nothing is locked or blurred.",
    contains: "What a report contains",
    containsList: [
      "Verdict score from 0 to 100 with licence and coverage",
      "The money: bonus, turnover, expected loss, expected value",
      "Cost per €100 of bonus and the wagering effort in spins",
      "Payout timeline from request to money in your account",
      "Contradictions between the two documents, both quoted",
      "Risk chips, a playbook and what would void your balance",
    ],
    refundTitle: "Refunds",
    refundBody: "Unused credits are refundable within 14 days of purchase. Used credits are not refundable. A failed or blocked analysis never uses a credit.",
    buy: "Buy",
    signUpLine: "3 free reports. Then €3.90 per report. No subscription.",
    getStarted: "Start free",
  },

  /* ---------------- Auth ---------------- */
  login: {
    title: "Sign in",
    lead: "Sign in to run your analysis. Your reports are saved to your account.",
    pricingLine: "3 free reports. Then €3.90 per report. No subscription.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    sendCode: "Email me a code",
    codeLabel: "6-digit code",
    codeHint: (email: string) => `Enter the code we sent to ${email}.`,
    verify: "Sign in",
    resend: "Send a new code",
    changeEmail: "Use a different email",
    or: "or",
    google: "Continue with Google",
    after: "After you sign in you go straight to the analysis screen.",
    errors: {
      email: "Enter a valid email address.",
      send: "We could not send the code. Try again in a minute.",
      code: "That code is wrong or expired. Request a new one.",
      oauth: "Google sign-in did not complete. Try again or use your email.",
    },
    sending: "Sending…",
    verifying: "Checking…",
  },
  signOut: "Sign out",

  /* ---------------- Analyse ---------------- */
  analyse: {
    title: "Analyse the terms",
    lead: "Paste both links. We read them, quote every number and show you the cost.",
    mainLabel: "General terms",
    mainHint: "The full terms and conditions page, e.g. https://example.com/en/terms-and-conditions",
    bonusLabel: "Bonus terms",
    bonusHint: "Bonus rules are often a separate document — that is where the wagering numbers live. Paste the link.",
    urlPlaceholderMain: "https://casino.example/terms",
    urlPlaceholderBonus: "https://casino.example/bonus-terms",
    willRead: "We will read",
    pasteTitle: "Paste text or add a file",
    pasteLead: "Use this when a site blocks us or you have the terms saved.",
    pasteFor: "This text is the",
    roleMain: "General terms",
    roleBonus: "Bonus terms",
    pastePlaceholder: "Paste the full terms text here",
    pasteCount: (n: number, max: number) => `${new Intl.NumberFormat("en-IE").format(n)} / ${new Intl.NumberFormat("en-IE").format(max)} characters`,
    addFile: "Add .txt or .md file",
    fileAs: (role: string) => `Added as ${role.toLowerCase()}`,
    removeFile: (name: string) => `Remove ${name}`,
    clearText: "Clear text",
    usingText: (role: string) => `Using pasted text for ${role.toLowerCase()}.`,
    submit: "Analyse the terms",
    submitting: "Reading both documents…",
    steps: ["Fetching both documents", "Extracting every number with its quote", "Computing the real cost"],
    continueMainOnly: "Continue with general terms only",
    ageTitle: "Confirm your age",
    ageLabel: "I am 18 or older and allowed to gamble where I live.",
    ageRequired: "Confirm you are 18 or older to continue.",
    quotaLine: (free: number, credits: number) =>
      free > 0 ? `${free} free report${free === 1 ? "" : "s"} left.` : credits > 0 ? `${credits} credit${credits === 1 ? "" : "s"} left.` : "No reports left. Buy a credit to continue.",
    fromHost: (host: string) => `Second analysis for ${host}. Add the bonus terms link for this offer.`,
    errors: {
      empty: "Enter the general terms link.",
      too_long: "That link is longer than 2,048 characters.",
      invalid: "That does not look like a web address.",
      scheme: "Use a link that starts with http:// or https://.",
      ip_literal: "Use the casino's web address, not an IP address.",
      localhost: "Use a public web address.",
      same_url: "The bonus link is the same as the general terms link. Paste the separate bonus page.",
      fileType: "Add a .md, .markdown, .txt or .text file.",
      fileSize: "Files must be 1 MB or smaller.",
      fileCount: "Add at most 2 files.",
      textTooLong: "Paste at most 200,000 characters.",
      needMain: "Add the general terms as a link, pasted text or a file.",
      rateHour: "You have run 6 analyses in the last hour. Try again later.",
      rateDay: "You have run 20 analyses today. Try again tomorrow.",
      rateIp: "Too many fetches from your network. Wait a minute and try again.",
      llm: "The analysis service could not read these terms. Nothing was charged. Try again in a minute.",
      generic: "Something went wrong. Nothing was charged. Try again.",
      unverified: "Verify your email before your first analysis.",
      bothBlocked: "We could not read either document. Paste the text instead. Nothing was charged.",
    },
  },
  blocked: {
    title: (role: string) => `We could not read the ${role.toLowerCase()}`,
    reasons: {
      http_status: "The site refused automated reading.",
      interstitial: "The site showed a bot check instead of the terms.",
      too_short: "The page had too little text to be the terms.",
      js_shell: "The page only loads its text with JavaScript.",
      not_html: "The link is not a web page.",
      network: "The site did not respond.",
      timeout: "The site took longer than 10 seconds.",
      too_large: "The page is larger than 5 MB.",
      unsafe_host: "That address is not a public website.",
    } as Record<string, string>,
    paste: "Paste the text of this page below instead.",
  },

  /* ---------------- Paywall ---------------- */
  paywall: {
    title: "Your free reports are used",
    lead: "Your next report is ready to run.",
    willRead: "It will read",
    willContain: "It will contain",
    containsList: [
      "Verdict and score",
      "The money: four numbers with formulas",
      "Cost of the bonus and wagering effort",
      "Payout timeline",
      "Contradictions between documents",
      "Risk chips, playbook and what voids your balance",
    ],
    buyOne: "1 report — €3.90",
    buyThree: "3 reports — €9.90",
    note: "One-time payment through Stripe. No subscription.",
    close: "Not now",
    redirecting: "Opening checkout…",
    error: "Checkout could not start. Try again.",
  },

  /* ---------------- Report ---------------- */
  report: {
    profileLabel: "Profile",
    profiles: { risky: "Risky", balanced: "Balanced", protected: "Protected" } satisfies Record<ProfileId, string>,
    profileHelp: {
      risky: "Weights the bonus value most.",
      balanced: "Weights cost and payout friction equally.",
      protected: "Weights licence and payout safety most.",
    } satisfies Record<ProfileId, string>,
    verdict: {
      good: "Fair terms for a bonus",
      caution: "Proceed with care",
      poor: "Costly terms",
    } satisfies Record<Verdict, string>,
    verdictLine: {
      good: "The bonus costs less than it gives, and the payout rules are clear.",
      caution: "The bonus has real costs. Read the risk chips before you deposit.",
      poor: "The bonus is likely to cost you more than it is worth.",
    } satisfies Record<Verdict, string>,
    verdictTitle: "Verdict",
    scoreAria: (score: number, verdict: string) => `Score ${score} out of 100: ${verdict}`,
    licenseChip: (regulator: string | null, tier: number) =>
      regulator ? `${regulator}${tier === 3 ? " · EU/UK licence" : tier === 2 ? " · offshore licence" : ""}` : "No licence stated",
    coverage: { 100: "2 documents read", 60: "General terms only", 0: "No documents read" } as Record<number, string>,
    documents: {
      title: "Documents",
      line: (read: number) => (read === 2 ? "You gave us both documents. Every number below comes from them." : "Add the bonus terms next time. That is where the wagering numbers live."),
      roleMain: "General terms",
      roleBonus: "Bonus terms",
      missing: "Not provided",
      blocked: "Blocked",
      sourceUrl: "Link",
      sourcePaste: "Pasted",
      sourceFile: "File",
    },
    money: {
      title: "The money",
      line: (ev: number | null, cur: string) =>
        ev === null ? "We could not find enough numbers to compute the value of this bonus." : ev < 0 ? `On average this bonus costs you ${fmtMoney(-ev, cur)} more than it gives.` : `On average this bonus is worth ${fmtMoney(ev, cur)} after wagering.`,
      bonus: "Bonus",
      turnover: "Required turnover",
      loss: "Expected loss",
      ev: "Expected value",
      fBonus: (pct: number | null) => (pct ? `${fmtNumber(pct)}% match, max amount` : "max amount stated"),
      fTurnover: (m: number | null, base: string | null) => (m === null ? "multiplier not found" : base === "deposit_plus_bonus" ? `(deposit + bonus) × ${fmtNumber(m)}` : `bonus × ${fmtNumber(m)}`),
      fLoss: (edge: number) => `turnover × ${fmtNumber(edge * 100)}% house edge`,
      fEv: "bonus − expected loss",
      negAria: (loss: number, bonus: number, cur: string) => `Expected loss ${fmtMoney(loss, cur)} against a bonus of ${fmtMoney(bonus, cur)}`,
      fx: (src: string, rate: number, date: string) => `Converted from ${src} at the ECB rate of ${date} (1 EUR = ${rate} ${src}).`,
      sourceAmount: (amount: string) => `Stated as ${amount}`,
    },
    cost: {
      title: "Cost of the bonus",
      caption: (x: number | null, cur: string) => (x === null ? "We need the bonus amount and wagering to compute this." : `For every ${fmtMoney(100, cur)} in bonus you lose ${fmtMoney(x, cur)} on average.`),
      bonusLabel: "Bonus",
      lossLabel: "Expected loss",
      aria: (bonus: string, loss: string) => `Bar chart: bonus ${bonus}, expected loss ${loss}`,
    },
    wagering: {
      title: "Wagering effort",
      caption: (bet: number, spins: number | null, days: number | null, cur: string) =>
        spins === null ? "We could not find the wagering requirement." : `At ${fmtMoney(bet, cur)} per spin that is ${new Intl.NumberFormat("en-IE").format(spins)} spins${days ? ` in ${days} days` : ""}.`,
      aria: (m: number) => `${m} times wagering, shown as ${Math.min(40, Math.round(m))} of 40 squares`,
      over: (m: number) => `${fmtNumber(m)}× — more than the 40 squares shown`,
      multiplierUnit: "× wagering",
    },
    payout: {
      title: "Payout timeline",
      line: (max: number | null) => (max === null ? "The terms do not say how long withdrawals take." : `Plan for up to ${max} business days from request to money.`),
      steps: ["Request", "Verification", "Approval", "Money in account"],
      stepDays: (r: { min: number; max: number } | null) => (r ? (r.min === r.max ? `${r.max} day${r.max === 1 ? "" : "s"}` : `${r.min}–${r.max} days`) : "not stated"),
      instant: "same day",
      kyc: { none: "no ID check stated", above_threshold: "ID check above a threshold", on_withdrawal: "ID check on first withdrawal", always: "ID check required" } as Record<string, string>,
      split: (limit: string, period: string) => `Paid in instalments of ${limit} per ${period}`,
      aria: "Payout timeline from request to money in your account",
    },
    contradiction: {
      title: "Contradiction",
      line: "The two documents state different numbers for the same rule.",
      trust: "Which number to trust",
      trustBody: "Bonus rules usually override general terms for that offer. Ask support in writing which number applies and keep the reply.",
      main: "General terms say",
      bonus: "Bonus terms say",
    },
    risks: {
      title: "Risk chips",
      line: (n: number) => (n === 0 ? "We found no common bonus traps in these documents." : `We found ${n} rule${n === 1 ? "" : "s"} that can cost you money. Tap one to see the clause.`),
    },
    playbook: { title: "Playbook", line: "Follow these steps to keep the bonus and your balance.", why: "Why", clause: (ref: string | null) => (ref ? `Clause ${ref}` : "Clause not numbered") },
    void: {
      title: "What would void your balance",
      line: "These clauses let the casino cancel your bonus or winnings.",
      none: "We found no void clauses in these documents. Read the full terms before you deposit.",
    },
    footer: {
      age: "18+",
      disclaimer: "Informational only, not legal advice. The casino's own terms always apply.",
      verify: "Verify it yourself: open each quote and check it against the casino's page.",
      rg: "Responsible gambling help",
    },
    quote: {
      open: (label: string) => `Show the source quote for ${label}`,
      title: "Source quote",
      from: (role: string, ref: string | null) => `${role}${ref ? ` · clause ${ref}` : ""}`,
      close: "Close",
      notFound: "Not found in the documents.",
      ambiguous: "The document states this in more than one way.",
    },
    notFound: "Not found",
    sticky: { score: (n: number) => `${n}/100` },
    outOf: "/100",
    actions: {
      share: "Share",
      shared: "Link copied",
      copy: "Copy as text",
      copied: "Copied",
      checkAgain: "Check again",
      checking: "Checking…",
      unchanged: (date: string) => `No changes since ${date}.`,
      changed: "The terms have changed",
      changedBody: "Run an updated report to see which numbers changed. It uses one report.",
      runUpdated: "Run updated report",
      another: (host: string) => `Analyse another bonus from ${host}`,
      blockedRecheck: "We could not re-read one of the documents. Try again later.",
    },
    changes: {
      title: "The terms have changed",
      line: (n: number, date: string) => `${n} number${n === 1 ? "" : "s"} changed since the report of ${date}.`,
      before: "Before",
      after: "After",
    },
    shareCta: { title: "Run your own analysis", body: "Paste the terms of any casino and see what the bonus costs.", button: "Analyse the terms" },
    sharedLabel: "Shared report · read-only",
    created: (date: string) => `Report from ${date}`,
  },

  /** Plain-English labels for every field the report can cite. */
  fields: {
    "operator.name": "Operator",
    "operator.domain": "Domain",
    "operator.regulator": "Regulator",
    "operator.licenseNumber": "Licence number",
    "withdrawal.minAmount": "Minimum withdrawal",
    "withdrawal.feePercent": "Withdrawal fee",
    "withdrawal.feeCondition": "Fee condition",
    "withdrawal.processingDays": "Processing time",
    "withdrawal.splitPayouts": "Split payouts",
    "withdrawal.sameMethodRequired": "Same method required",
    "withdrawal.kycRequired": "ID verification",
    "bonus.maxAmount": "Bonus amount",
    "bonus.percent": "Match percentage",
    "bonus.minDeposit": "Minimum deposit",
    "bonus.wageringMultiplier": "Wagering multiplier",
    "bonus.wageringBase": "Wagering base",
    "bonus.maxBet": "Maximum bet",
    "bonus.slotsContribution": "Slots contribution",
    "bonus.liveContribution": "Live casino contribution",
    "bonus.excludedGamesCount": "Excluded games",
    "bonus.expiryDays": "Time to wager",
    "bonus.maxWinCap": "Winnings cap",
    "bonus.cashFirst": "Real money used first",
    "bonus.forfeitOnWithdrawal": "Forfeit on early withdrawal",
    "bonus.maxWinNoDeposit": "No-deposit winnings cap",
  } as Record<string, string>,

  flags: {
    cash_first: { title: "Cash first", meaning: "Your deposit is played before the bonus, so the bonus only helps once your own money is gone.", action: "Expect to lose your deposit before bonus funds start." },
    win_cap: { title: "Winnings cap", meaning: "Winnings above the cap are removed when you withdraw.", action: "Check the cap before you chase a big win." },
    split_payouts: { title: "Split payouts", meaning: "Large wins are paid in instalments over weeks or months.", action: "Plan for slow payout of large amounts." },
    low_live_contribution: { title: "Live games barely count", meaning: "Live casino stakes count little or nothing toward wagering.", action: "Play games that count 100% if you want to clear the bonus." },
    excluded_games: { title: "Excluded games", meaning: "Some games do not count, and playing them can void the bonus.", action: "Open the excluded games list before you play." },
    max_bet: { title: "Max bet", meaning: "One bet above the limit can void the bonus and its winnings.", action: "Set your stake at or below the limit and keep it there." },
    short_expiry: { title: "Short expiry", meaning: "You have only a few days to complete the wagering.", action: "Only claim the bonus if you can play the full turnover in time." },
    withdrawal_fee: { title: "Withdrawal fee", meaning: "The casino charges a fee on some withdrawals.", action: "Read when the fee applies and withdraw to avoid it." },
    forfeit_on_withdrawal: { title: "Forfeit on withdrawal", meaning: "Withdrawing before wagering is complete cancels the bonus and its winnings.", action: "Finish wagering before you withdraw, or decline the bonus." },
    kyc_on_withdrawal: { title: "ID check at payout", meaning: "You must verify your identity before you get paid.", action: "Upload your ID before your first withdrawal." },
    same_method: { title: "Same method", meaning: "Withdrawals go back to the method you deposited with.", action: "Deposit with the method you want to be paid to." },
    confiscation_discretion: { title: "Sole discretion", meaning: "The casino can withhold funds at its own discretion.", action: "Keep screenshots of your balance and your bets." },
    dormancy_fee: { title: "Dormancy fee", meaning: "An inactive account is charged a fee.", action: "Withdraw your balance before you stop playing." },
    void_bonus_abuse: { title: "Bonus abuse clause", meaning: "Play the casino calls bonus abuse can void your winnings.", action: "Play normally and within the stated limits." },
    void_multiple_accounts: { title: "One account only", meaning: "Opening more than one account voids winnings on all of them.", action: "Use one account per person and household." },
    void_vpn: { title: "No VPN", meaning: "Hiding your location can void your balance.", action: "Play only from where you are allowed to play." },
    void_irregular_play: { title: "Irregular play", meaning: "Hedged or low-risk betting patterns can void the bonus.", action: "Do not hedge bets to clear wagering." },
    void_chargeback: { title: "Chargebacks", meaning: "A payment chargeback can close your account and void your balance.", action: "Contact support instead of disputing a payment." },
  } satisfies Record<FlagId, { title: string; meaning: string; action: string }>,

  playbook: {
    declineEv: (loss: string, bonus: string) => ({ step: "Consider declining the bonus", why: `The expected loss of ${loss} is larger than the ${bonus} bonus.` }),
    maxBet: (bet: string) => ({ step: `Keep every bet at or below ${bet}`, why: "A single bet above the limit can void the bonus and its winnings." }),
    turnover: (turnover: string, days: number | null) => ({ step: `Plan ${turnover} of play${days ? ` within ${days} days` : ""}`, why: "Unfinished wagering expires with the bonus." }),
    contribution: (slots: number | null, live: number | null) => ({
      step: "Play games that count 100% toward wagering",
      why: `Slots count ${slots === null ? "an unstated share" : `${fmtNumber(slots)}%`}${live === null ? "" : `, live casino ${fmtNumber(live)}%`}.`,
    }),
    cashFirst: () => ({ step: "Expect your deposit to be played first", why: "Real money is used before bonus funds." }),
    cap: (cap: string) => ({ step: `Know that winnings above ${cap} are removed`, why: "The winnings cap applies when you withdraw." }),
    forfeit: () => ({ step: "Do not withdraw before wagering is complete", why: "An early withdrawal forfeits the bonus and its winnings." }),
    kyc: () => ({ step: "Upload your ID before your first withdrawal", why: "Payouts wait until verification is complete." }),
    sameMethod: () => ({ step: "Deposit with the method you want to be paid to", why: "Withdrawals return to the deposit method." }),
    fee: (pct: number) => ({ step: `Check when the ${fmtNumber(pct)}% withdrawal fee applies`, why: "Some withdrawals are charged a fee." }),
    readAll: () => ({ step: "Read the full bonus terms before you deposit", why: "Rules not covered here still apply." }),
  },

  /* ---------------- Library ---------------- */
  reports: {
    title: "My reports",
    lead: "Every report you run is saved here. Open one to check it again.",
    emptyTitle: "No reports yet",
    emptyBody: "Paste the general terms link and the bonus terms link of a casino. Bonus rules are usually a separate page — add both for the full picture.",
    emptyCta: "Analyse the terms",
    score: (n: number) => `${n}/100`,
    newCta: "New analysis",
    changed: "Updated",
  },

  /* ---------------- Account ---------------- */
  account: {
    title: "Account",
    signedInAs: (email: string) => `Signed in as ${email}`,
    freeTitle: "Free reports",
    freeValue: (used: number, total: number) => `${Math.max(0, total - used)} of ${total} left`,
    creditsTitle: "Credits",
    creditsValue: (n: number) => `${n} credit${n === 1 ? "" : "s"}`,
    buyTitle: "Buy credits",
    paid: "Payment received. Your credits appear here within a few seconds.",
    cancelled: "Checkout was cancelled. Nothing was charged.",
    deleteTitle: "Delete your account",
    deleteBody: (email: string) => `Email ${email} from your account address and we delete your account and reports within 30 days.`,
    history: "Purchases",
    historyEmpty: "No purchases yet.",
    historyRow: (pack: number, date: string) => `${pack} credit${pack === 1 ? "" : "s"} · ${date}`,
  },

  /* ---------------- Usage (admin, read-only) ---------------- */
  usage: {
    title: "Usage",
    provider: "Active provider",
    model: "Model",
    fallback: "Fallback",
    none: "None",
    avgCost: "Average cost per report (30 days)",
    p95: "p95 extraction latency (30 days)",
    reports: "Reports (30 days)",
    target: "Target: under €0.08 per report and p95 under 20 s.",
    forbidden: "This page is for administrators.",
  },

  /* ---------------- Errors ---------------- */
  notFound: { title: "This page does not exist.", cta: "Analyse the terms" },
  error: { title: "Something went wrong on our side.", cta: "Back to the analysis" },
  shareExpired: { title: "This share link has expired or is not valid.", cta: "Run your own analysis" },

  values: {
    yes: "Yes",
    no: "No",
    percent: (n: number) => `${fmtNumber(n)}%`,
    times: (n: number) => `${fmtNumber(n)}×`,
    days: (n: number) => `${fmtNumber(n)} day${n === 1 ? "" : "s"}`,
    dayRange: (min: number, max: number) => (min === max ? `${fmtNumber(max)} days` : `${fmtNumber(min)}–${fmtNumber(max)} days`),
    perPeriod: (amount: string, period: string) => `${amount} per ${period}`,
    capMultiple: (x: number, of: string) => `${fmtNumber(x)}× the ${of}`,
    base: { bonus: "bonus only", deposit_plus_bonus: "deposit + bonus", winnings: "winnings" } as Record<string, string>,
    kyc: { none: "Not required", on_withdrawal: "On withdrawal", above_threshold: "Above a threshold", always: "Always" } as Record<string, string>,
    count: (n: number) => fmtNumber(n),
  },
  text: {
    heading: (host: string) => `SnapTerms report — ${host}`,
    score: (n: number, verdict: string, profile: string) => `Verdict: ${verdict} (${n}/100, ${profile} profile)`,
    source: (label: string, quote: string, ref: string | null) => `  ${label}: "${quote}"${ref ? ` (clause ${ref})` : ""}`,
    link: (url: string) => `Full report: ${url}`,
  },

  a11y: {
    loading: "Loading",
    closeDialog: "Close dialog",
    menu: "Main",
  },
} as const;

export const RG_COPY = {
  title: "Responsible gambling",
  lead: "Gambling is entertainment, not a way to make money. If it stops being fun, help is free and confidential.",
  helpFirst: "Get help now",
  near: (country: string | null) => (country ? `Resources for your location (${country})` : "International resources"),
  international: "International resources",
  signs: "Signs to take a break",
  signsList: [
    "You spend more than you planned.",
    "You chase losses with bigger bets.",
    "You borrow money or skip bills to gamble.",
    "You hide your gambling from people close to you.",
  ],
  tools: "Tools that help",
  toolsList: [
    "Set deposit limits in your casino account before you play.",
    "Use time-outs and self-exclusion when you need a break.",
    "Block gambling sites on your devices.",
  ],
  ourRole: "What SnapTerms does",
  ourRoleBody: "We explain casino terms so you can see costs before you deposit. We do not offer gambling, take bets or earn money from casinos.",
};

/** Help resources, help-first. Keyed by ISO country; "INTL" is the fallback. Verify before launch. */
export interface RgResource {
  name: string;
  url: string;
  phone?: string;
  note: string;
}
export const RG_RESOURCES: Record<string, RgResource[]> = {
  GB: [
    { name: "National Gambling Helpline (GamCare)", url: "https://www.gamcare.org.uk", phone: "0808 8020 133", note: "Free, 24/7, confidential." },
    { name: "GAMSTOP", url: "https://www.gamstop.co.uk", note: "Self-exclude from all UK-licensed sites." },
    { name: "BeGambleAware", url: "https://www.begambleaware.org", note: "Advice, tools and support." },
  ],
  IE: [{ name: "Problem Gambling Ireland", url: "https://www.problemgambling.ie", note: "Support and counselling in Ireland." }],
  DE: [{ name: "Check dein Spiel (BIÖG)", url: "https://www.check-dein-spiel.de", note: "Free advice and self-tests in German." }],
  SE: [
    { name: "Stödlinjen", url: "https://www.stodlinjen.se", note: "Free support line in Sweden." },
    { name: "Spelpaus", url: "https://www.spelpaus.se", note: "Self-exclude from all Swedish-licensed sites." },
  ],
  US: [{ name: "National Council on Problem Gambling", url: "https://www.ncpgambling.org", phone: "1-800-GAMBLER", note: "Free, confidential, 24/7." }],
  AU: [
    { name: "Gambling Help Online", url: "https://www.gamblinghelponline.org.au", phone: "1800 858 858", note: "Free, 24/7 counselling." },
    { name: "BetStop", url: "https://www.betstop.gov.au", note: "National self-exclusion register." },
  ],
  INTL: [
    { name: "Gambling Therapy", url: "https://www.gamblingtherapy.org", note: "Free international online support in many languages." },
    { name: "Gamblers Anonymous", url: "https://www.gamblersanonymous.org", note: "Peer support meetings worldwide." },
  ],
};

export const LEGAL = {
  updated: "Last updated 31 October 2026",
  terms: {
    title: "Terms of use",
    sections: [
      { h: "What SnapTerms is", p: ["SnapTerms reads casino terms you give us and explains what they say and what a bonus costs. It is an information tool. It is not legal, financial or gambling advice."] },
      { h: "Who can use it", p: ["You must be 18 or older and allowed to gamble where you live. You need an account with a verified email address."] },
      { h: "Your reports", p: ["Every number in a report comes from the documents you provide and links to its source sentence. Casinos change their terms. The casino's own current terms always apply, so check each quote against the casino's page before you deposit."] },
      { h: "Free reports and credits", p: ["Each account gets 3 free reports. After that, each report uses one credit. Credits are bought through Stripe as a one-time payment: €3.90 for one, €9.90 for three. Credits do not expire.", "A report that fails or a document we cannot read never uses a free report or a credit."] },
      { h: "Refunds", p: ["Unused credits are refundable within 14 days of purchase. Email us from your account address. Used credits are not refundable. When a payment is refunded, its unused credits are removed."] },
      { h: "Fair use", p: ["Run up to 6 analyses per hour and 20 per day. Do not use SnapTerms to plan multiple accounts, VPN use, hedged betting, chargebacks or anything else that breaks a casino's rules. Reports point out the clauses that would void your funds; we do not help you get around them."] },
      { h: "Share links", p: ["A share link lets anyone with the link read one report for 30 days. Only share it with people you trust."] },
      { h: "Liability", p: ["We work hard to read terms correctly but we cannot promise every number is right. To the extent the law allows, our liability is limited to the amount you paid us in the last 12 months."] },
      { h: "Contact", p: ["Questions or refunds: email the support address in the footer."] },
    ],
  },
  privacy: {
    title: "Privacy",
    sections: [
      { h: "What we store", p: ["Your email address and sign-in data (through Supabase). The reports you run, including the document links, extracted numbers and quotes. Purchase records from Stripe: the session id, number of credits and date. We never see or store your card details."] },
      { h: "What we do not store", p: ["We do not store your IP address. We keep a one-way hash of it for one week to enforce fetch limits."] },
      { h: "Who processes data", p: ["Supabase (database and sign-in), Vercel (hosting), Stripe (payments) and our AI provider, which reads the casino documents to extract numbers. Casino documents are public text; we do not send your email to the AI provider."] },
      { h: "Cookies", p: ["We use only the cookies needed to keep you signed in. No advertising or tracking cookies."] },
      { h: "Your rights", p: ["You can ask for a copy of your data or ask us to delete your account and reports. Email us from your account address and we act within 30 days."] },
    ],
  },
} as const;

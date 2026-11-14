# SnapTerms

Paste a casino's general terms link and its bonus terms link and get back an infographic verdict. Every number comes with the quote it was taken from. Each account gets 3 free reports, then pays per report with Stripe credits (€3.90 for 1, €9.90 for 3).

Stack: Next.js 15 (App Router) · TypeScript strict · Tailwind v4 · Supabase (Postgres + Auth) · Drizzle · Stripe Checkout · Anthropic / OpenAI / DeepSeek / Ollama Cloud behind one seam (`lib/llm/extract.ts`).

## Commands

```bash
pnpm install
pnpm dev              # local dev server
pnpm check            # typecheck + copy:check + tests (83 tests, incl. quota race / webhook replay on PGlite)
pnpm dev:stack        # local stand-ins (Postgres, sign-in, AI) so the whole app runs with no accounts; see below
pnpm db:migrate       # apply drizzle/*.sql to DATABASE_URL (or DIRECT_DATABASE_URL)
pnpm llm:check        # run the fixture through the configured provider(s); fails on any wrong number or cost > €0.08
pnpm llm:check openai # one provider only (set LLM_MODEL_OPENAI)
pnpm build && pnpm start
```

## Run the whole app locally with no accounts

`pnpm dev:stack` starts an in-memory Postgres, a mock sign-in service and a mock AI endpoint, and prints the variables to put in `.env.local`. Then run `pnpm dev`. Sign in with any email; the code is always `123456`. The mock AI always answers with the Northbridge sample extraction, so paste `tests/fixtures/conflict-pair/main.md` and `bonus.md` to get a full report. Stripe checkout is the one thing it cannot fake. Never deploy with these values.

Note: some networks block casino domains at DNS level. From such a network, real casino links show as "The site did not respond" locally even though they work from Vercel.

## Deploy to production (one time, about 30 minutes)

### 1. Supabase
1. Create a project in an EU region.
2. **Authentication → Providers**: enable **Email**. Under **Email templates → Magic link / OTP**, make sure the template includes `{{ .Token }}`, because users type a 6-digit code.
3. Enable **Google**: create an OAuth client in Google Cloud and add the redirect URI that Supabase shows you.
4. **Authentication → URL configuration**: set Site URL to `https://YOUR_DOMAIN` and add `https://YOUR_DOMAIN/auth/callback` to Redirect URLs.
5. **Authentication → SMTP**: connect your own SMTP provider. Supabase's built-in mailer is rate-limited and not meant for production.
6. Copy the connection strings from **Project Settings → Database**:
   - `DATABASE_URL`: the **transaction pooler** (port 6543), used by the app on Vercel.
   - `DIRECT_DATABASE_URL`: the **session/direct** connection, used only for migrations.
7. Run `DIRECT_DATABASE_URL=... pnpm db:migrate`. This creates the 5 tables, RLS policies, the FK to `auth.users` and the free-report check constraint.

### 2. Stripe
1. Create two one-time **Prices** in EUR: €3.90 ("1 SnapTerms report") and €9.90 ("3 SnapTerms reports"). Copy the `price_…` ids.
2. **Developers → Webhooks**: add the endpoint `https://YOUR_DOMAIN/api/webhook` with the events `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded`. Copy the signing secret (`whsec_…`).
3. Do this once in **test mode** first (test keys and test prices) and run the checklist below. Then repeat with live keys.

### 3. LLM provider
The default is Anthropic `claude-haiku-5-5`, chosen to hit the €0.08 per report cost target. Set `ANTHROPIC_API_KEY` and the two price variables in `.env.example`. You can optionally set `LLM_FALLBACK=openai` with its key and model. Run `pnpm llm:check` locally with the production `.env` before deploying.

### 4. Vercel (or Netlify, see 4b)
1. Import the repository with `main` as the production branch and set every variable from `.env.example` for Production. Pick a function region close to your Supabase region. `APP_URL` is your final https domain. Generate `APP_SECRET` with `openssl rand -base64 48`.
2. Deploy. If any variable is missing, the server refuses to boot and the logs list each one by name.
3. Optional: once you have a real report worth showing, put its id in `SAMPLE_REPORT_ID` and the landing page uses it instead of the illustrative sample.

### 4b. Netlify instead of Vercel
The repo includes `netlify.toml`, so Netlify works as an alternative host.
1. In Netlify choose **Add new site → Import an existing project**, pick this repository and the `main` branch. Build settings are read from `netlify.toml` (`pnpm build`, Node 22); the Next.js runtime is added automatically.
2. Under **Site configuration → Environment variables**, add every variable from `.env.example`. Set `APP_URL` to the Netlify (or custom) domain, and use that same domain for the Supabase redirect URL and the Stripe webhook.
3. Deploy. The visitor's country (for help resources) and IP (for fetch limits) are read from Netlify's own headers.
4. Check the function time limit on your Netlify plan. One analysis can take up to about a minute in the worst case (10 s fetch plus a slow AI call and one repair call). If your limit is lower, slow analyses end with an error and nothing is charged; a fast model such as `claude-haiku-5-5` normally finishes well inside it.

### 5. Go-live checklist (Definition of Done)
- [ ] Sign up with email OTP, then with Google.
- [ ] Analyse a site with both links: the report shows "2 documents read".
- [ ] Analyse a site that blocks bots: that document switches to paste, and no report is used.
- [ ] Analyse general terms only: the verdict says "Not enough data" and no bonus number is shown.
- [ ] Scroll a report on a phone: the compact verdict bar appears at the top.
- [ ] Run 3 reports, then a 4th: the paywall opens and shows what the next report would contain.
- [ ] Buy 1 credit in **test mode** with card `4242 4242 4242 4242`: the credit appears on `/account`. The next report uses it.
- [ ] Re-send the same event from the Stripe dashboard: the credit count does not change.
- [ ] Refund the test payment: unused credits disappear.
- [ ] Switch to live keys, make one real €3.90 purchase, then refund it.
- [ ] Open a share link in a private window: it is readable without logging in.
- [ ] Check `/usage` (with your email in `ADMIN_EMAILS`): average cost is under €0.08 and p95 is under 20 s.
- [ ] Check every link on `/legal/responsible-gaming` and update `RG_RESOURCES` in `lib/copy.ts` for your markets.
- [ ] Have the terms and privacy text in `lib/copy.ts` (`LEGAL`) reviewed for your jurisdiction.

## Where things live
| Area | File |
|---|---|
| Every user-facing string | `lib/copy.ts` (`pnpm copy:check` enforces this) |
| Extraction schema (zod, single source of truth) | `lib/schema/extraction.ts` |
| LLM seam, repair call and fallback | `lib/llm/extract.ts`, `config/llm.ts` |
| Single / dual / main-only call paths | `lib/pipeline/analyse.ts` |
| Quote verification ("a number without a quote is null") | `lib/pipeline/quotes.ts` |
| Deterministic merge and conflicts | `lib/pipeline/merge.ts` |
| Money math and scoring (no LLM) | `lib/pipeline/money.ts`, `lib/pipeline/score.ts`, `config/scoring.ts` |
| Quota / credit transaction | `lib/quota/createReport.ts` |
| Fetching (SSRF-safe, 7-day cache, 12/min/IP) | `lib/fetch/*` |
| Report cards | `components/report/cards/*` |
| Design tokens | `app/globals.css` (`@theme`) |

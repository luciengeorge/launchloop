# LaunchLoop

**Paste your repo. Get your whole launch.**

LaunchLoop turns a vibe-coded app into a launch kit. Paste a public GitHub repo or a live URL and it reads the README, `package.json`, recent commits and the live page, writes a short product brief, then generates:

- Landing page copy: headline, subheadline, CTA, features, meta title and description
- A Product Hunt post: name, tagline, description, topics and maker comment
- A 5–7 post X thread and a LinkedIn post
- Three on-brand social images rendered with `@vercel/og` (1200×630, 1600×900, 1270×760 PH gallery) in colours pulled from the site's CSS
- A launch-day checklist

Every platform limit is enforced (PH tagline 60, description 260, X 280 weighted, LinkedIn 3,000) and vote requests are stripped out. Visitors get a free watermarked preview (the PH tagline plus one X post). The full kit costs **£19** through Stripe Checkout and arrives on a results page, as a ZIP and by email via Resend. `/ship-loop` takes waitlist sign-ups and pre-orders for the £12/month (£99/year) subscription.

Stack: Next.js 16 (App Router, Cache Components), TypeScript, Tailwind v4, shadcn/ui, Stripe, Resend, `@vercel/og`, Playwright.

## Run it locally

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:3417
```

No keys are needed. With nothing configured, the app runs end to end in **mock mode**:

| Integration | Without a key |
| --- | --- |
| LLM | Deterministic template copy built from the real brief (`src/lib/copy.ts`) |
| Stripe | A local test checkout page at `/checkout/mock` |
| Resend | Emails (with the ZIP attached) go to a local outbox: `GET /api/dev/outbox` |
| Storage | JSON files in `./.data` |

Click **Try a sample app** on the home page for an offline demo, or paste any public repo or site.

To use real services, copy `.env.example` to `.env.local` and fill in what you need.

## Environment variables

All are optional locally. See [`.env.example`](.env.example) for the full annotated list.

| Variable | Needed for |
| --- | --- |
| `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` | Real copy generation. `openai` covers any OpenAI-compatible API; `anthropic` is also built in. |
| `STRIPE_SECRET_KEY` | Real Stripe Checkout (use `sk_test_…` for test mode) |
| `STRIPE_WEBHOOK_SECRET` | Verifying `/api/stripe/webhook` |
| `STRIPE_PRICE_KIT`, `STRIPE_PRICE_SHIPLOOP_MONTHLY`, `STRIPE_PRICE_SHIPLOOP_YEARLY` | Optional: dashboard Prices instead of inline £19 / £12 / £99 |
| `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO` | Sending kit and pre-order emails |
| `RESEND_SEGMENT_ID` or `RESEND_AUDIENCE_ID` | Storing newsletter, waitlist and buyer contacts in Resend |
| `GITHUB_TOKEN` | Optional: GitHub API limit goes from 60 to 5,000 requests/hour |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | **Production storage** (Upstash Redis / Vercel KV) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, email links |
| `MOCK_MODE` | Force everything into mock mode |
| `PREVIEW_RATE_LIMIT_PER_HOUR` | Free previews per IP per hour (default 12) |
| `SENTRY_DSN` | Reserved for Sentry (see "Error logging") |

### Testing Stripe locally

```bash
stripe listen --forward-to localhost:3417/api/stripe/webhook   # prints STRIPE_WEBHOOK_SECRET
```

Pay with card `4242 4242 4242 4242`. The webhook isn't required locally: the Checkout success URL (`/api/checkout/return`) verifies the session server-side and starts fulfilment. The webhook is the backstop if the buyer closes the tab.

## How it works

```
URL ─▶ ingest (GitHub API + live page, SSRF-guarded)  ─▶ facts (stack, stars, commits, README stats)
                                                       ─▶ brief (LLM, facts override)  ─▶ preview (free)
Stripe paid ─▶ recordPayment ─▶ fulfilKit: full copy (LLM + rubric + retry) ─▶ enforce limits ─▶ ZIP + email
```

| Path | What it does |
| --- | --- |
| `src/lib/ingest/` | GitHub reader, live-page scraper, brand-colour extraction (hex/rgb/hsl/oklch), SSRF-safe fetch |
| `src/lib/brief.ts` | Deterministic facts and the LLM product brief |
| `src/lib/llm.ts` | **The only LLM module.** Provider interface, structured-JSON validation, rubric-driven retries |
| `src/lib/copy.ts` | Prompts, mock writer, rubric (limits, vote-begging, hype words), final enforcement |
| `src/lib/limits.ts` | Platform limits, X weighted length, vote-request stripping |
| `src/lib/images.tsx` | The three OG images via `@vercel/og`, watermarked until paid |
| `src/lib/fulfil.ts` | Idempotent post-payment generation and email |
| `src/lib/payments.ts` | Stripe Checkout (or the mock checkout URL) |
| `src/lib/email.ts`, `src/lib/audience.ts` | Resend email and contacts, with mock outbox |
| `src/lib/store.ts` | Key-value store: Upstash REST or local JSON files |

To add an LLM provider, implement `LLMProvider.complete()` in `src/lib/llm.ts` and return it from `getProvider()`.

## SEO and AI discoverability

- Metadata, Open Graph and Twitter tags in `src/app/layout.tsx`; a generated site OG image at `/opengraph-image`
- `/sitemap.xml` and `/robots.txt` (kits, checkout and API are disallowed; kit pages are `noindex`)
- `/faq` with `FAQPage` JSON-LD; `SoftwareApplication` JSON-LD with offers on the home page
- `/llms.txt`: a plain-language description for AI assistants
- Semantic HTML: one `h1` per page, landmarks, labelled forms, a skip link

## Error logging

`src/lib/observability.ts` exposes `captureException` / `captureMessage` and `registerErrorHook`. Server errors flow in through `onRequestError` in `src/instrumentation.ts`. Client errors (error boundaries plus `window` error and unhandled-rejection listeners in `src/instrumentation-client.ts`) are beaconed to `/api/log`. To plug in Sentry:

```bash
npm i @sentry/nextjs
```

Initialise Sentry in `register()` in `src/instrumentation.ts`, then call `registerErrorHook((e, ctx) => Sentry.captureException(e, { extra: ctx }))`.

## Tests

```bash
npm run test:e2e:install   # once: downloads Chromium
npm run test:e2e
```

Playwright builds the app into `.next-test` and runs it on port 3418 in forced mock mode, alongside a fixture site on port 3419. The smoke tests cover:

- the home page, validation and newsletter signup (desktop and mobile)
- the full sample flow: preview → mock checkout → full kit, with every character counter within its limit, no "upvote" anywhere, ZIP download, all three images and the email in the outbox
- live-page ingestion: name, features and brand colour
- Ship Loop waitlist and pre-order
- the SEO endpoints

Also: `npm run lint`, `npm run typecheck`, `npm run build`.

## Deploy to Vercel

1. Push this repo and import it in Vercel (framework preset: Next.js; no build settings to change).
2. Add **Upstash Redis** from the Vercel Marketplace. It injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without it, kits are written to `/tmp` and disappear between invocations.
3. Add the environment variables: `LLM_*`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_FROM` (on a verified domain), `RESEND_SEGMENT_ID` or `RESEND_AUDIENCE_ID`, `GITHUB_TOKEN`, and `NEXT_PUBLIC_SITE_URL` (e.g. `https://launchloop.dev`).
4. In Stripe, add a webhook endpoint `https://<your-domain>/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and set `STRIPE_WEBHOOK_SECRET`.
5. Deploy. Kit generation runs in `after()` with `maxDuration` up to 120s. That works on Vercel's default Fluid compute; on plans with lower limits, reduce it.

For a production launch-day discount, create a promotion code in Stripe; Checkout has `allow_promotion_codes` turned on.

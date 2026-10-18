# LaunchLoop

**Paste your repo. Get your whole launch.**

LaunchLoop turns a vibe-coded app into a launch kit. Paste a public GitHub repo or a live URL and it reads the README, `package.json`, recent commits and the live page, writes a short product brief, then generates:

- Landing page copy: headline, subheadline, CTA, features, meta title and description
- A Product Hunt post: name, tagline, description, topics and maker comment
- A 5–7 post X thread and a LinkedIn post
- Three on-brand social images rendered with `@vercel/og` (1200×630, 1600×900, 1270×760 PH gallery) in colours pulled from the site's CSS
- A launch-day checklist

Every platform limit is enforced (PH tagline 60, description 260, X 280 weighted, LinkedIn 3,000) and vote requests are stripped out. Visitors get a free watermarked preview (the PH tagline plus one X post). The full kit costs **£19** through Stripe Checkout and arrives on a results page, as a ZIP and by email via Resend. `/ship-loop` takes waitlist sign-ups and pre-orders for the £12/month (£99/year) subscription.

Stack: Next.js 16 (App Router, Cache Components), TypeScript, Tailwind v4, shadcn/ui, AI SDK 7 with Vercel AI Gateway, Stripe, Resend, `@vercel/og`, Playwright.

## Run it locally

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:3417
```

No keys are needed. With nothing configured, the app runs end to end in **mock mode**:

| Integration | Without a key |
| --- | --- |
| LLM (AI Gateway) | Deterministic template copy built from the real brief (`src/lib/copy.ts`) |
| Stripe | A local test checkout page at `/checkout/mock` |
| Resend | Emails (with the ZIP attached) go to a local outbox: `GET /api/dev/outbox` |
| Storage | JSON files in `./.data` |

Click **Try a sample app** on the home page for an offline demo, or paste any public repo or site.

To use real services, copy `.env.example` to `.env.local` and fill in what you need.

## Environment variables

All are optional locally. See [`.env.example`](.env.example) for the full annotated list.

| Variable | Needed for |
| --- | --- |
| `AI_GATEWAY_API_KEY` | Local copy generation through Vercel AI Gateway. Not needed on Vercel (OIDC) or after `vercel env pull` |
| `AI_GATEWAY_MODEL`, `AI_GATEWAY_FALLBACK_MODELS` | Primary model (default `anthropic/claude-sonnet-4.5`) and fallbacks (default `openai/gpt-5-mini`; `none` disables) |
| `LLM_PROVIDER` | Set to `mock` to force template copy even when gateway credentials exist |
| `STRIPE_SECRET_KEY` | Real Stripe Checkout (use `sk_test_…` for test mode) |
| `STRIPE_WEBHOOK_SECRET` | Verifying `/api/stripe/webhook` |
| `STRIPE_PRICE_KIT`, `STRIPE_PRICE_SHIPLOOP_MONTHLY`, `STRIPE_PRICE_SHIPLOOP_YEARLY` | Optional: dashboard Prices instead of inline £19 / £12 / £99 |
| `STRIPE_PROMO_LAUNCH14` | Optional: the LAUNCH14 promotion code id (`promo_…`). Without it, Checkout looks up the active code named `LAUNCH14` (see "Experiments") |
| `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO` | Sending kit and pre-order emails |
| `RESEND_SEGMENT_ID` or `RESEND_AUDIENCE_ID` | Storing newsletter, waitlist and buyer contacts in Resend |
| `GITHUB_TOKEN` | Optional: GitHub API limit goes from 60 to 5,000 requests/hour |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | **Production storage** (Upstash Redis / Vercel KV) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, email links |
| `MOCK_MODE` | Force everything into mock mode |
| `PREVIEW_RATE_LIMIT_PER_HOUR`, `PREVIEW_RATE_LIMIT_PER_DAY` | Free previews per IP per hour (default 5) and per UTC day (default 20). See "Free preview limits" |
| `PREVIEW_GLOBAL_DAILY_CAP` | Optional spend cap: free previews and tagline generations across all visitors per UTC day (default 1500). Past it, `/api/kits` and `/api/tools/taglines` return 503 `code: "busy"` ("LaunchLoop is very busy right now, try again in a bit"). Paid kit generation is never capped by it |
| `FREE_PREVIEWS_DISABLED` | Optional kill switch: `1` turns off free previews and tagline generations with the same `busy` response. Paid kit generation keeps running. Unset = on |
| `KIT_RETRY_BACKOFF_MS` | Optional: waits between paid kit generation attempts, comma-separated milliseconds (default `10000,30000`). See "Paid kit failures" |
| `SENTRY_DSN` | Reserved for Sentry (see "Error logging") |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Conversion analytics (see "Analytics"). Host defaults to `https://eu.i.posthog.com` |

### Free preview limits

`freePreviewGate` in `src/lib/rate-limit.ts` guards every free LLM call (`/api/kits` and `/api/tools/taglines`); paid kit generation never goes through it. In order:

1. `FREE_PREVIEWS_DISABLED=1` returns 503 `busy`.
2. The input is validated first, so a malformed URL returns 422 without using a slot. A valid URL that fails later (a missing repo) still counts: it costs a GitHub API call, and refunding it would let one IP drain the shared GitHub quota.
3. The sample app (`sample`) skips both counters; it's served from the 24-hour dedupe cache.
4. Per IP, fixed hourly and UTC-daily windows in the store. IPv6 addresses are keyed by their /64. A refusal is a 429 with a `Retry-After` header and `retryAfterSeconds` in the body, and the form says "Try again in N min".
5. The global daily cap (`cap:previews:<UTC day>`, `PREVIEW_GLOBAL_DAILY_CAP`) returns 503 `busy`. It's checked after the per-IP limit so one noisy IP can't use it up.

**Store errors fail closed.** If Upstash errors, the gate returns 503 `busy` and reports the error to Sentry (`stage: rate-limit.store`) rather than letting the request through. Kits and briefs live in the same store, so failing open would spend model calls on previews that can't be saved, and would drop abuse protection exactly when nobody's watching.

### Paid kit failures

`fulfilKit` (`src/lib/fulfil.ts`) makes up to 3 attempts, waiting 10s and then 30s between them (`KIT_RETRY_BACKOFF_MS`), inside the `after()` of whichever route triggered it (webhook, Checkout return, status poll; 120s `maxDuration`). Sections that succeed are kept, so a retry only writes what's missing. If the waits won't fit in the function (slow 45s timeouts), the kit records `nextAttemptAt` and the kit page's status poll starts the next attempt when it's due.

When the last attempt fails:

- the kit is `status: "failed"` with `refund_needed: true` and `failedAt`. No template or partial copy is delivered: no content, no ZIP, and the kit and account pages show a "We hit a problem generating your kit" state with a Try again button;
- the buyer gets one email through Resend: "We hit a problem generating your kit. We're on it: you'll get it, or a full refund";
- Sentry gets an unthrottled error (`stage: fulfil.final_failure`, with `kitId` and `paymentRef`) and PostHog gets `kit_generation_failed`.

Refunds are never automatic: find kits with `refund_needed: true` (Sentry alert or PostHog event), then deliver the kit (the Try again button, or `POST /api/kits/<id>/retry`) or refund the payment in Stripe. A retry that succeeds clears `refund_needed`.

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
| `src/lib/llm.ts` | **The only LLM module.** AI SDK `generateText` + `Output.object` through the AI Gateway provider, fallback models, rubric-driven retries |
| `src/lib/copy.ts` | Prompts, mock writer, rubric (limits, vote-begging, hype words), final enforcement |
| `src/lib/limits.ts` | Platform limits, X weighted length, vote-request stripping |
| `src/lib/images.tsx` | The three OG images via `@vercel/og`, watermarked until paid |
| `src/lib/fulfil.ts` | Idempotent post-payment generation and email |
| `src/lib/payments.ts` | Stripe Checkout (or the mock checkout URL) |
| `src/lib/email.ts`, `src/lib/audience.ts` | Resend email and contacts, with mock outbox |
| `src/lib/store.ts` | Key-value store: Upstash REST or local JSON files |

## LLM: Vercel AI Gateway

All model calls go through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) using the AI SDK's `gateway` provider (`@ai-sdk/gateway`), in `src/lib/llm.ts`:

- **Models:** primary `anthropic/claude-sonnet-4.5`, with `openai/gpt-5-mini` as a gateway-level fallback via `providerOptions.gateway.models`. If every provider for the primary fails, the gateway retries on the fallback. Override with `AI_GATEWAY_MODEL` and `AI_GATEWAY_FALLBACK_MODELS` using IDs from `https://ai-gateway.vercel.sh/v1/models`. The model that actually answered is saved on each kit (`kit.llm`, e.g. `gateway:anthropic/claude-sonnet-4.5`).
- **Auth on Vercel:** automatic OIDC. The provider reads the per-request `x-vercel-oidc-token` header, so no key is needed. Keep "Secure backend access with OIDC federation" enabled in the project settings; it's on by default.
- **Auth locally:** run `vercel link` (project `launchloop`, team `luciengeorge16`) and `vercel env pull .env.local` to get a `VERCEL_OIDC_TOKEN` (valid ~12 hours; re-pull or use `vercel dev`), or set `AI_GATEWAY_API_KEY`. An API key always takes precedence over OIDC.
- **Mock mode:** with no `AI_GATEWAY_API_KEY`, no `VERCEL_OIDC_TOKEN` and not running on Vercel, or with `LLM_PROVIDER=mock` / `MOCK_MODE=true`, copy comes from deterministic templates and nothing is sent to the gateway. Mock mode is for local development and tests only: on a production deployment (`VERCEL_ENV=production`) it's refused and every call fails as if the gateway were down.
- **Structured output:** `generateText` with `Output.object()` and zod schemas that hold types only. Character limits, thread length and banned phrases are checked by a rubric; failures are fed back for up to three attempts, then hard-enforced.
- **No prompt training:** every call sets `providerOptions.gateway.disallowPromptTraining: true`, so the gateway only routes to providers that don't train on prompts (fallbacks included). A model with no qualifying provider fails with `no_providers_available` and the visitor sees `ai_busy`; check this when changing `AI_GATEWAY_*_MODEL`. It isn't enforced for BYOK keys.
- **Output budgets:** every call sets `maxOutputTokens` (`OUTPUT_TOKENS` in `src/lib/llm.ts`): brief 800, preview and taglines 400, kit sections 1500, LinkedIn 2500. At the rubric limits the JSON measures roughly 310, 80, 45, 300 to 440 and 650 tokens. If an answer is still cut off (`finishReason: "length"`, e.g. CJK copy or a reasoning-model fallback), the next attempt gets double the budget.
- **Sentry noise:** gateway failures are reported through `captureExceptionThrottled` (`src/lib/observability.ts`): at most one event per error type (`llm.gateway:<error name>:<status>`) per minute per instance, with a count of the skipped ones on the next event. Skipped ones are still logged. Store errors in the rate limiter (`rate-limit.store`) use the same throttle.
- **No template fallback:** when the gateway fails on every model (main, then the fast model, then `AI_GATEWAY_FALLBACK_MODELS`, or a 45s timeout), nothing stands in for the AI. The free preview and tagline generator return 503 `code: "ai_busy"` ("Our AI is busy, try again in a minute"), save nothing, and the form offers Retry with the same input; the browser records `preview_failed` with `code: "ai_busy"`. A brief, preview or kit section the model keeps returning incomplete is the same error, never patched with canned text. Paid kits: see "Paid kit failures".

To switch models, change the env vars; no code changes are needed.

## SEO and AI discoverability

- Metadata, Open Graph and Twitter tags in `src/app/layout.tsx`; a generated site OG image at `/opengraph-image`
- `/sitemap.xml` and `/robots.txt` (kits, checkout and API are disallowed; kit pages are `noindex`)
- `/faq` with `FAQPage` JSON-LD; `SoftwareApplication` JSON-LD with offers on the home page
- `/llms.txt`: a plain-language description for AI assistants
- Semantic HTML: one `h1` per page, landmarks, labelled forms, a skip link

## Analytics

Vercel Web Analytics and Speed Insights count page views and performance. PostHog tracks the preview-to-purchase funnel. It's off until `NEXT_PUBLIC_POSTHOG_KEY` is set.

| Event | Fired from | Properties |
| --- | --- | --- |
| `preview_started` | Browser, kit form submit | `source` (github / site / sample), `plan` (free / kit intent), `isLoggedIn` |
| `preview_completed` | Browser, preview stream done | the above plus `kitId`, `durationMs` |
| `preview_failed` | Browser, preview error | the above plus `code` |
| `checkout_started` | Server, `/api/checkout` once a session URL exists | `plan` (kit / shiploop_monthly / shiploop_yearly), `product_type` (kit / shiploop), `kitId`, `price_id`, `amount` in pence (after any discount), `currency`, `isLoggedIn`, `mock`, `promo_code` / `promo` when LAUNCH14 was due, `$feature/<flag>` for the variants the page showed |
| `checkout_completed` | Server, Stripe webhook (`checkout.session.completed` / `async_payment_succeeded` with `payment_status: paid`), or `/api/checkout/mock` in test mode | the above plus `stripeSessionId`. `amount` is Stripe's `amount_total`; `promo_code` is LAUNCH14 or a code the buyer typed (Ship Loop) |

**`checkout_completed` is the purchase event**: it only fires once Stripe confirms the payment, from the webhook, so it doesn't depend on the buyer's browser coming back. Filter `mock = false` and `env = production` for real revenue. No email or other buyer details are sent.

Every event also carries `env` (production / preview / development).

- **Cookieless.** `posthog-js` runs with `persistence: "memory"`: no cookies, no local storage, a fresh anonymous id per full page load, and no person profiles. Autocapture, session replay, surveys and heatmaps are off. URL properties are scrubbed like Vercel Analytics (private kit ids become `[id]`, query strings keep only `utm_`).
- **Joining server events.** The browser sends its PostHog id with `/api/checkout`; it goes into the Checkout session metadata (`ph_distinct_id`, plus `price_id` and `logged_in`) so the webhook's `checkout_completed` lands on the same id. Its uuid is derived from the session id, so webhook retries don't double count. Preview deployments never get the webhook, so they don't send `checkout_completed` for real Stripe sessions.
- **Carrying the id across our own redirects.** When we cause a full page load (magic link, Stripe Checkout success and cancel), the page's id goes along as `?aid=` (in the login intent, or `ph_distinct_id` in Checkout metadata) and the next page bootstraps PostHog with it. Flag variants (hashed on the id) and funnel events stay on one id with nothing stored in the browser. A manual reload or a fresh visit still gets a new id.
- **Proxy.** The browser sends to `/lp-relay`, rewritten in `next.config.ts` to `NEXT_PUBLIC_POSTHOG_HOST`, so ad blockers don't drop events. The server posts to PostHog directly.

### UTMs and acquisition funnels

`posthog-js` reads `utm_source`, `utm_medium`, `utm_campaign` (and `utm_content`, `utm_term`) from the landing URL, so a link like `https://launchloop.dev/?utm_source=x&utm_medium=social&utm_campaign=week2` puts them on that `$pageview` and on every later browser event in the visit (`preview_started`, `preview_completed`, ...). Nothing strips them first: PostHog boots in `instrumentation-client.ts` before React, the URL scrubber keeps `utm_` params, the in-page start links keep them in the URL, and every internal "start" link navigates client-side so the visit (and its anonymous id) carries on. Server events (`checkout_started`, `checkout_completed`) don't carry UTMs themselves; they join through the shared id (see above).

To see which source converts, use a funnel and let the first step supply the source:

1. Product analytics → New insight → **Funnels**, aggregating by unique users.
2. Steps: `$pageview` → `preview_completed` → `checkout_started` → `checkout_completed`. Add a filter `env = production` (and `mock = false` on the last two steps).
3. **Breakdown** by event property `utm_source` (or `utm_campaign` for a single campaign), with breakdown attribution **First touchpoint** (the default). "All steps" would drop everyone, because the server-side steps don't carry UTMs.
4. A conversion window of a day or so fits: the funnel only joins within a visit (see the cookieless note above). A visitor who comes back later in a new tab starts a new anonymous id.

Person properties like `$initial_utm_source` aren't useful here: anonymous visitors get no person profile.

### Experiments

Two PostHog multivariate flags (50/50, variants `control` and `treatment`), evaluated in the browser by `useExperiment` (`src/lib/use-experiment.ts`). Reading a flag sends PostHog's `$feature_flag_called` exposure. Until flags arrive the paywall price shows a placeholder; if they fail or take over 1.5 s the page shows control and sends no exposure.

| Flag | Where | `control` | `treatment` |
| --- | --- | --- | --- |
| `exp_launch14_promo` | Kit paywall (`UnlockPanel`) | £19, and kit Checkout has no promotion code field | £19 struck through, £14 with `LAUNCH14`; kit Checkout gets `discounts: [{ promotion_code }]` |
| `exp_shiploop_success_upsell` | Kit success page (`/account/kits/[id]?paid=1`, buyer only) | Unchanged | Soft Ship Loop card: £99/year pre-order (Checkout for `STRIPE_PRICE_SHIPLOOP_YEARLY`) or the free waitlist |

- **LAUNCH14 lives in Stripe.** The code's terms (amount, kit only, first-time customers, redemption cap, expiry) are set on the coupon and promotion code in the dashboard; the app only sends the promotion code id (`STRIPE_PROMO_LAUNCH14`, else looked up by code). If Stripe turns the code down, or no active code exists, the buyer gets a £19 session and the paywall says so before redirecting. Turn the flag off (or roll it to 100% `control`) when the code expires.
- **The variant is reported by the browser.** `/api/checkout` trusts the `experiments` it's sent. With a fresh id per page load anyone could reload until they see the promo anyway, so the Stripe-side limits are the guard, not the flag.
- **Toggling.** In PostHog (project LaunchLoop EU): Feature flags → the flag → set the release condition's variant split (e.g. `control` 100% to stop the test, `treatment` 100% to ship it) or disable the flag (everyone sees control). Changes apply on the next page load; no deploy.

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
- the free preview with no account: a fresh visitor previews a live site, and the kit link opens for anyone
- analytics: UTMs on `$pageview` and later events, and one anonymous id from a landing page through to the server-side `checkout_completed` (the fixture server records what the fake PostHog receives at `/ph/_events`)
- the full sample flow: preview → mock checkout → full kit, with every character counter within its limit, no "upvote" anywhere, ZIP download, all three images and the email in the outbox
- live-page ingestion: name, features and brand colour
- Ship Loop waitlist and pre-order
- the SEO endpoints

Unit tests (Vitest, `tests/unit/`) run against an in-memory store: the free-preview gate, the `/api/kits` rate limit (6th request in an hour and 21st in a day get a 429 with `Retry-After`; Upstash errors fail closed) and the LLM output budgets:

```bash
npm test
```

Also: `npm run lint`, `npm run typecheck`, `npm run build`.

## Deploy to Vercel

1. Push this repo and import it in Vercel (framework preset: Next.js; no build settings to change).
2. Add **Upstash Redis** from the Vercel Marketplace. It injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without it, kits are written to `/tmp` and disappear between invocations.
3. AI Gateway needs no key on Vercel (OIDC). Optionally set `AI_GATEWAY_MODEL` / `AI_GATEWAY_FALLBACK_MODELS`, and make sure the team has AI Gateway credits or BYOK configured. Add the other environment variables: `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_FROM` (on a verified domain), `RESEND_SEGMENT_ID` or `RESEND_AUDIENCE_ID`, `GITHUB_TOKEN`, and `NEXT_PUBLIC_SITE_URL` (e.g. `https://launchloop.dev`).
4. In Stripe, add a webhook endpoint `https://<your-domain>/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and set `STRIPE_WEBHOOK_SECRET`.
5. Deploy. Kit generation runs in `after()` with `maxDuration` up to 120s; the free preview (`/api/kits`) and tagline generator (`/api/tools/taglines`) allow 300s, the Hobby limit with Fluid compute. Each model attempt times out after 45s. On plans with lower limits, reduce them.

For a production launch-day discount, create a promotion code in Stripe; Checkout has `allow_promotion_codes` turned on.

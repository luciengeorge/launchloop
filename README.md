# LaunchLoop

**Paste your repo. Get your whole launch.**

LaunchLoop turns a vibe-coded app into a launch kit. Paste a public GitHub repo or a live URL and it reads the README, `package.json`, recent commits and the live page, writes a short product brief, then generates:

- Landing page copy: headline, subheadline, CTA, features, meta title and description
- A Product Hunt post: name, tagline, description, topics and maker comment
- A 5–7 post X thread and a LinkedIn post
- Three on-brand social images rendered with `@vercel/og` (1200×630, 1600×900, 1270×760 PH gallery) in colours pulled from the site's CSS
- A launch-day checklist

Every platform limit is enforced (PH tagline 60, description 260, X 280 weighted, LinkedIn 3,000) and vote requests are stripped out. Visitors get a free watermarked preview (the PH tagline plus one X post). The full kit costs **£19** through Stripe Checkout and arrives on a results page, as a ZIP and by email via Resend. Ship Loop (`/ship-loop`) is a free waitlist only: sign-ups are tagged `shiploop_waitlist` and emailed if and when it launches. Nothing about Ship Loop is for sale, and `/api/checkout` answers any non-kit product with a 400 and the waitlist message.

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
| `STRIPE_PRICE_KIT` | Optional: a dashboard Price instead of the inline £19 |
| `STRIPE_PROMO_LAUNCH14` | Optional: the LAUNCH14 promotion code id (`promo_…`). Without it, Checkout looks up the active code named `LAUNCH14` (see "Experiments") |
| `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO` | Sending kit and sign-in emails |
| `RESEND_SEGMENT_ID` or `RESEND_AUDIENCE_ID` | Storing newsletter, waitlist and buyer contacts in Resend |
| `GITHUB_TOKEN` | Optional: GitHub API limit goes from 60 to 5,000 requests/hour |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | **Production storage** (Upstash Redis / Vercel KV) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, email links |
| `MOCK_MODE` | Force everything into mock mode |
| `PREVIEW_RATE_LIMIT_PER_HOUR`, `PREVIEW_RATE_LIMIT_PER_DAY` | Free previews (and free tool generations) per IP: default 10 an hour and 40 a day, from `PREVIEW_LIMITS` in `src/lib/site.ts`. A missing, malformed or non-positive value uses the default. The limiter, the 429 copy, the terms, privacy page, pricing, FAQ and llms.txt all read `resolvedPreviewLimits()`, so they follow an override. Override only for testing. See "Free preview limits" |
| `OG_PREVIEW_RATE_LIMIT_PER_HOUR` | OG preview tool checks per IP per hour (default 60) |
| `NEWSLETTER_RATE_LIMIT_PER_HOUR` | Newsletter signups per IP per hour, shared across instances (default 10) |
| `NEWSLETTER_WELCOME_DAILY_CAP` | Newsletter welcome emails per day across everyone (default 200). Past it, signups still subscribe without the email |
| `CHECKOUT_RATE_LIMIT_PER_HOUR` | Optional: signed-out kit checkouts per IP per hour (default 20) |
| `PREVIEW_GLOBAL_DAILY_CAP` | Optional spend cap: free previews and tagline generations across all visitors per UTC day (default 1500). Past it, `/api/kits` and `/api/tools/taglines` return 503 `code: "busy"` ("LaunchLoop is very busy right now, try again in a bit"). Paid kit generation is never capped by it |
| `FREE_PREVIEWS_DISABLED` | Optional kill switch: `1` turns off free previews and tagline generations with the same `busy` response. Paid kit generation keeps running. Unset = on |
| `KIT_RETRY_BACKOFF_MS` | Optional: waits between paid kit generation attempts, comma-separated milliseconds (default `10000,30000`). See "Paid kit failures" |
| `SENTRY_DSN` | Reserved for Sentry (see "Error logging") |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Conversion analytics (see "Analytics"). Host defaults to `https://eu.i.posthog.com` |

### Free preview limits

`freePreviewGate` in `src/lib/rate-limit.ts` guards every free LLM call (`/api/kits` and `/api/tools/taglines`); paid kit generation never goes through it. In order:

1. `FREE_PREVIEWS_DISABLED=1` returns 503 `busy`.
2. The input is validated first, so a malformed URL returns 422 without using a slot.
3. The sample app (`sample`) skips both counters; it's served from the 24-hour dedupe cache.
4. Per IP, fixed hourly and UTC-daily windows in the store. IPv6 addresses are keyed by their /64. A refusal is a 429 with a `Retry-After` header, and `retryAfterSeconds` (time to the end of the window that's full) and `limits` (the enforced allowance) in the body. The form says "Try again in N min" and states the allowance from `limits`, since the browser bundle can't see the env overrides. A refused request gives its slot straight back, so retrying while limited doesn't use up the day.
5. The global daily cap (`cap:previews:<UTC day>`, `PREVIEW_GLOBAL_DAILY_CAP`) returns 503 `busy` (and gives the per-IP slot back). It's checked after the per-IP limit so one noisy IP can't use it up. It counts every attempt that gets this far and is never refunded.

**A preview counts once a model call has completed.** A run that fails before the brief is written (a private or missing repo, an unreachable or empty site, the AI Gateway down) calls `slot.refund()` and gets its slot back. Each of those still cost a GitHub or site fetch, so an IP gets at most 10 refunds an hour and 30 a day (`PREVIEW_REFUNDS_PER_HOUR`, `PREVIEW_REFUNDS_PER_DAY`, testing only); past that a failure counts like a preview. A visitor who closes the tab doesn't stop the run: the preview is still written and saved (and reachable from the kit link or after login), so it counts. A dedupe cache hit (the same repo at the same commit within 24 hours, `kit.reusedFrom`) makes no model call, so it's refunded the same way, within the same allowance.

**The limit box is never a dead end.** The 429 carries `kitId`, the visitor's newest unpaid preview from the last day (from the `ll_kits` cookie, or their account when signed in; nothing new is stored), and the form shows "Unlock my kit, <price>" linking to it, or "See the Launch Kit, <price>" to `/pricing` without one. Next to it, "Try again in N min" counts down to the reset and becomes a retry at 0.

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

### Guest checkout

Signed-out visitors can buy the kit without logging in. Checkout has no customer or account behind it and Stripe collects the email; the kit id, UTMs and LAUNCH14 metadata are the same as for signed-in buyers. Guest sessions use `customer_creation: "if_required"` (no Stripe Customer; the email comes back in `customer_details`), except when LAUNCH14 is applied: it's first-time-only, which Stripe's API reference says is invalid without a Customer, so those keep `"always"`. Once paid (webhook or success URL), the kit goes to that email (`src/lib/accounts.ts`):

- an email that has logged in before (`user:<email>:account`, or an existing kit index) gets the kit in its account straight away;
- any other email gets a pending purchase (`pending:<email>:kits`), claimed into the account on that address's first magic-link login. A signed-in session already sees its pending purchases in My kits.

The buyer lands on `/checkout/success`, which offers a magic link prefilled with the email from the Checkout session. Signed-in buyers still land on `/account/kits/[id]?paid=1`.

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
| `src/lib/accounts.ts` | Accounts (emails that have logged in), and guest purchases waiting for their email's first login |
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
- IndexNow: changed blog, guide and tool URLs are pinged after each production deploy (see `docs/seo/indexnow.md`)
- Semantic HTML: one `h1` per page, landmarks, labelled forms, a skip link

## Analytics

Vercel Web Analytics and Speed Insights count page views and performance. PostHog tracks the preview-to-purchase funnel. It's off until `NEXT_PUBLIC_POSTHOG_KEY` is set.

| Event | Fired from | Properties |
| --- | --- | --- |
| `preview_started` | Browser, kit form submit | `source` (github / site / sample), `plan` (free / kit intent), `isLoggedIn` |
| `preview_completed` | Browser, preview stream done | the above plus `kitId`, `durationMs` |
| `preview_failed` | Browser, preview error | the above plus `code` |
| `kit_created` | Server, `/api/kits` once the preview kit is saved (streamed or not) | `kitId`, `source` (github / site / sample), `isLoggedIn`, `stream`, `reused` (same repo state within 24 h), `durationMs`, `client_disconnected` when the browser had gone, plus the kit's first-touch `utm_*`, `referring_domain` and `is_test` |
| `newsletter_subscribed` | Browser, newsletter form success (no-JS posts aren't counted) | `placement` (footer / preview), `welcome` (sent / existing / skipped: whether this signup sent the welcome email) |
| `checkout_started` | Server, `/api/checkout` once a session URL exists | `plan` (kit), `product_type` (kit / shiploop), `kitId`, `price_id`, `amount` in pence (after any discount), `currency`, `isLoggedIn`, `mock`, `promo_code` / `promo` when LAUNCH14 was due, `$feature/<flag>` for the variants the page showed (`fallback/<flag>` when it served a fallback) |
| `checkout_completed` | Server, Stripe webhook (`checkout.session.completed` / `async_payment_succeeded` with `payment_status: paid`), or `/api/checkout/mock` in test mode | the above plus `stripeSessionId`. `amount` is Stripe's `amount_total`; `promo_code` is LAUNCH14 (kit only; Checkout has no promotion code field) |

**`checkout_completed` is the purchase event**: it only fires once Stripe confirms the payment, from the webhook, so it doesn't depend on the buyer's browser coming back. Filter `mock = false` and `env = production` for real revenue. No email or other buyer details are sent.

**`kit_created` is the server's count of finished previews**, a separate event from `preview_completed` so existing dashboards don't double count. `preview_completed` only fires when the browser is still there at the end; a closed tab, a dropped stream (`preview_failed` with `recovered: true`) or a visitor who leaves mid-generation still gets a kit, and only `kit_created` sees it. It's captured on the page's id (sent as `analyticsId` with the preview request, see `pageAnalyticsId` in `src/lib/analytics.ts`), else a `server_` id, and its uuid comes from the kit id, so one kit counts once. Use it rather than `preview_completed` as the funnel's preview step when you want every kit made.

Every event also carries `env` (production / preview / development).

- **Cookieless.** `posthog-js` runs with `persistence: "memory"`: no cookies, no local storage, a fresh anonymous id per full page load, and no person profiles. Autocapture, session replay, surveys and heatmaps are off. URL properties are scrubbed like Vercel Analytics (private kit ids become `[id]`, query strings keep only `utm_`).
- **Joining server events.** The browser sends its PostHog id with `/api/kits` (for `kit_created`) and `/api/checkout`; the checkout one goes into the Checkout session metadata (`ph_distinct_id`, plus `price_id` and `logged_in`) so the webhook's `checkout_completed` lands on the same id. Its uuid is derived from the session id, so webhook retries don't double count. Preview deployments never get the webhook, so they don't send `checkout_completed` for real Stripe sessions.
- **Carrying the id across our own redirects.** When we cause a full page load (magic link, Stripe Checkout success and cancel), the page's id goes along as `?aid=` (in the login intent, or `ph_distinct_id` in Checkout metadata) and the next page bootstraps PostHog with it. Funnel events (and flags hashed on the id, like the Ship Loop upsell) stay on one id with nothing stored in the browser. A manual reload or a fresh visit still gets a new id, which is why the kit paywall's price experiment is hashed on the kit instead (see "Experiments").
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

Two PostHog multivariate flags (50/50, variants `control` and `treatment`). Until the variant is known the paywall price shows a placeholder. Each view records exactly what it served, once, on the page's anonymous id (the id its checkout events use):

- **Assigned:** PostHog's `$feature_flag_called` exposure with `$feature_flag_response` = the variant shown. This is what PostHog experiments count.
- **Fallback:** when flags take over 1.5 s (`reason: "timeout"`), the flags request fails (`"error"`), or the flag is off for this id (`"unassigned"`), the page serves control and records a `flag_fallback` event (`flag`, `variant: "control"`, `reason`, `fallback: true`) instead of an exposure. Fallbacks are deliberately kept out of the experiment: counting them as control exposures would pile slow or blocked visitors into the control arm. A fallback never flips to the variant once flags do arrive.
- Checkout events carry `$feature/<flag>` only for assignments and `fallback/<flag>` for fallbacks, always with the variant the page served. posthog-js's own `$feature/<flag>` tags (from its evaluation for the page's id, which needn't be what was shown) are stripped from browser events in `before_send`.

- **`exp_launch14_promo` is bucketed per kit.** The kit page asks PostHog from the server (`kitVariant` in `src/lib/analytics-server.ts`, posthog-node) with the distinct id `kit:<kitId>`, and streams the answer to the paywall (`useAssignedExperiment`), which sends the exposure. Hashing on the browser's id would re-roll the price on every reload, since that id lives in page memory only. Same kit, same price, on any reload or device, with no cookie or storage. The unit is the kit, so a visitor who reloads is counted as several exposed (anonymous) users in the same arm, as before.
- **`exp_shiploop_success_upsell`** is evaluated in the browser by `useExperiment` (`src/lib/use-experiment.ts`) on the page's id. It shows once, straight back from Checkout, where `?aid=` keeps the buyer's id.

| Flag | Where | `control` | `treatment` |
| --- | --- | --- | --- |
| `exp_launch14_promo` | Kit paywall (`UnlockPanel`), and server-side on the header CTA, home, `/pricing`, `/faq`, `/ship-loop` and the kit form (`KitPrice`) | £19, and kit Checkout has no promotion code field | £19 struck through, £14 with `LAUNCH14`; kit Checkout gets `discounts: [{ promotion_code }]` |
| `exp_shiploop_success_upsell` | Kit success page (`/account/kits/[id]?paid=1`, buyer only) | Unchanged | Soft Ship Loop card with the waitlist capture (no checkout) |

- **LAUNCH14 lives in Stripe.** The code's terms (amount, kit only, first-time customers, redemption cap, expiry) are set on the coupon and promotion code in the dashboard; the app only sends the promotion code id (`STRIPE_PROMO_LAUNCH14`, else looked up by code). If Stripe turns the code down, or no active code exists, the buyer gets a £19 session and the paywall says so before redirecting. Turn the flag off (or roll it to 100% `control`) when the code expires.
- **Marketing pages read the promo flag on the server.** `isLaunchPromoOn()` (`src/lib/launch-promo-server.ts`) evaluates `exp_launch14_promo` for one fixed id, so it's only meaningful at a 0% or 100% rollout. It's cached with a 60 s revalidate (the pages are static and pick up a flip within a minute or two, no deploy), and any error or a 1.5 s timeout shows the plain £19. Kit checkouts don't use it: they resolve the kit's own assignment (next point), which matches the marketing pages at a 0% or 100% rollout, so a £14 seen on home or `/pricing` is then the Stripe total. PostHog serves no flags to bot user agents (including `HeadlessChrome`), so browser-side checks with a headless browser see control unless they set a normal user agent.
- **LAUNCH14 has a hard end.** From `LAUNCH_PROMO_ENDS_AT` (`src/lib/launch-promo.ts`, 22 Oct 2026 22:00 Paris) both `isLaunchPromoOn()` and `resolveKitPromo()` return off/control without reading `exp_launch14_promo`, so Checkout never applies £14 after it, whatever the flag says. A marketing page cached just before can show £14 for a few more minutes until it revalidates; Checkout still charges £19.
- **The server decides LAUNCH14.** `/api/checkout` ignores any promo variant in the request and resolves `exp_launch14_promo` itself with `resolveKitPromo` (`src/lib/kit-promo.ts`), the same function the paywall uses, so page and checkout agree: PostHog on `kit:<kitId>`; if PostHog doesn't answer (error or 1.5 s timeout), the variant PostHog last assigned that kit, which the server keeps next to the kit (`kitpromo:<kitId>`, 30 days; nothing in the browser); otherwise control. Checkout logs a server-side `flag_fallback` (`source: "checkout"`, `remembered`) and a server warning when PostHog didn't answer. A flag switched off is control for every kit at once, never the remembered variant. If the paywall showed £14 but the session isn't discounted (the flag changed since, or Stripe turned the code down), the buyer is told before paying.
- **Toggling.** In PostHog (project LaunchLoop EU): Feature flags → the flag → set the release condition's variant split (e.g. `control` 100% to stop the test, `treatment` 100% to ship it) or disable the flag (everyone sees control). Changes apply on the next page load; no deploy. Changing the split re-buckets some kits, as it would any flag. `exp_launch14_promo` can be set to evaluate on the server only, since the browser no longer reads it.

## Newsletter

"Weekly launch teardowns" has two signups: the footer, and a card under the free preview paywall (`src/components/kit/preview-newsletter.tsx`, hidden when the visitor arrives with `?unlock=1` on the way to checkout). Both post to `/api/newsletter`, which stores the contact with its `placement` (`footer` or `preview`; a repeat signup updates it) and adds it to the Resend segment. The lead magnet is the `/product-hunt-launch-checklist` guide: the success state links to it, and a new address gets one welcome email with the link (`src/emails/newsletter-welcome.tsx`).

- **One welcome email per address.** The send is claimed with an atomic `store().incr("newsletter:welcome:<email>")` before the response, so repeat or concurrent signups don't resend it. The response says what happened (`welcome`: `sent`, `existing` or `skipped`), and the success message only mentions an email when one was sent.
- **Limits.** Signups are limited per IP through the shared store (`NEWSLETTER_RATE_LIMIT_PER_HOUR`), and welcome emails have a global daily cap (`NEWSLETTER_WELCOME_DAILY_CAP`). Past the cap the contact is still added; the skip is logged.
- **Plain form posts** (no JS, or before hydration) are redirected back with `?subscribed=1`, or `?subscribed=0&error=<code>` and a `#hash` that reveals the message without JavaScript. `next` is only honoured as a same-origin path, checked after URL parsing in `newsletterReturnPath`, which builds every redirect.
- On a page with the £19 unlock panel, the footer's Subscribe button is an outline button so the unlock button is the only primary one.

## Ship Loop waitlist

Ship Loop is a free waitlist; nothing about it is sold. `/ship-loop` and the kit upsell post to `/api/waitlist`, which writes to the shared store (Upstash Redis in production and preview):

- `contact:waitlist:<email>`: `{ email, source: "waitlist", tag: "shiploop_waitlist", signup_source, plan, createdAt }`. A repeat signup keeps the first `createdAt` and answers `duplicate: true`.
- `contacts:waitlist`: a set of every waitlist email. `SMEMBERS contacts:waitlist` is the launch mailing list.

Preview keys carry the `preview:` prefix. The contact is also added to the Resend audience/segment, which is shared with newsletter and buyer contacts, so the store is the source of truth for who joined the waitlist.

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
- the newsletter signups in the footer and under the free preview (desktop and mobile): the checklist link on success, one welcome email per address, no-JS posts, safe redirects, and hidden on the way to checkout
- the free preview with no account: a fresh visitor previews a live site, and the kit link opens for anyone
- analytics: UTMs on `$pageview` and later events, and one anonymous id from a landing page through to the server-side `checkout_completed` (the fixture server records what the fake PostHog receives at `/ph/_events`)
- the full sample flow: preview → mock checkout → full kit, with every character counter within its limit, no "upvote" anywhere, ZIP download, all three images and the email in the outbox
- live-page ingestion: name, features and brand colour
- Ship Loop waitlist
- the SEO endpoints

Unit tests in `tests/unit` run without a browser or server. `npm test` runs both sets: the Playwright `*.spec.ts` files (`playwright.unit.config.ts`) and the Vitest `*.test.ts` files (`vitest.config.mts`, against an in-memory store): the free-preview gate, the `/api/kits` rate limit (11th request in an hour and 41st in a day get a 429 with `Retry-After`; Upstash errors fail closed), the no-template `ai_busy` path, paid kit retries and `refund_needed`, the LLM output budgets and `disallowPromptTraining`.

Also: `npm run lint`, `npm run typecheck`, `npm run build`. `.github/workflows/ci.yml` runs all of them plus the e2e suite.

## Deploy to Vercel

1. Push this repo and import it in Vercel (framework preset: Next.js; no build settings to change).
2. Add **Upstash Redis** from the Vercel Marketplace. It injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without it, kits are written to `/tmp` and disappear between invocations.
3. AI Gateway needs no key on Vercel (OIDC). Optionally set `AI_GATEWAY_MODEL` / `AI_GATEWAY_FALLBACK_MODELS`, and make sure the team has AI Gateway credits or BYOK configured. Add the other environment variables: `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_FROM` (on a verified domain), `RESEND_SEGMENT_ID` or `RESEND_AUDIENCE_ID`, `GITHUB_TOKEN`, and `NEXT_PUBLIC_SITE_URL` (e.g. `https://launchloop.dev`).
4. In Stripe, add a webhook endpoint `https://<your-domain>/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and set `STRIPE_WEBHOOK_SECRET`.
5. Deploy. Kit generation runs in `after()` with `maxDuration` up to 120s; the free preview (`/api/kits`) and tagline generator (`/api/tools/taglines`) allow 300s, the Hobby limit with Fluid compute. Each model attempt times out after 45s. On plans with lower limits, reduce them.

Checkout has no promotion code field. Kit discounts only come from the LAUNCH14 experiment (`discounts` on the session).

# launchloop.dev: why /kit/[id], /account and /account/kits/[id] score below 90 in Speed Insights
_Read-only investigation, 20 Oct 2026, ~19:00 Paris time (CEST). No POSTs, no previews, no checkout, no Vercel settings touched._

## TL;DR
- **The cause is CLS (layout shift), not load speed.** On all three routes the desktop P75 CLS is "poor" (above 0.25): **/kit/[id] 0.54, /account 0.40, /account/kits/[id] 0.31**. Every other route is at about 0. LCP, INP, FCP and TTFB are mostly in the "good" range.
- **The mechanism (reproduced on prod):** each route renders its data inside `<Suspense>`. The fallback skeleton is short (about 760 px for the kit pages, 384 px on /account), so the **site footer is painted inside the viewport** at y≈813 (y≈1010 at 1440p). When the Redis-backed content streams in about 0.5 to 2.3 s later, the page grows to about 3,700 px and the footer jumps out of view. That single shift scores **0.10 at 1440×900, 0.25 at 1920×1080 and 0.27 at 2560×1440**. Mobile scores 0, because the footer already starts below the fold. This is why it shows up on Desktop.
- **The Oct 17 dip is a small-sample artefact, not a regression.** On Oct 17 (Paris day) Speed Insights recorded only about 3 page views in total: 2 desktop hits on `/` with LCP/FCP 3.8 s and TTFB 516 ms, plus 1 mobile hit. /kit and /account had 0 samples that day. Nothing was deployed on Oct 17: commits stop at 16 Oct 10:18 CEST and resume 18 Oct 10:19 CEST.
- Speed Insights only started on 15 Oct (commit c76710d3, #2). The 7-day sample sizes are tiny: /kit/[id] desktop has 35 LCP datapoints, /account/kits/[id] 17, /account 11, and mobile has 0 to 1 per route. **Each route's score can swing on 1 or 2 visits.**

## 1. Measured numbers

### 1a. Speed Insights (field), production, P75, 13–20 Oct
Source: Vercel MCP `create_observability_query` on `vercel.speed_insights.{lcp_ms,inp_ms,cls,fcp_ms,ttfb_ms}`, grouped by route and deviceType. Raw JSON is in `/workspace/perf/speed-insights/`.

| Route | Device | n (LCP) | LCP | INP | CLS | FCP | TTFB |
|---|---|---|---|---|---|---|---|
| /kit/[id] | desktop | 35 | 784 ms | 32 ms | **0.539** | 264 ms | 94 ms |
| /kit/[id] | mobile | 0 (1 INP/CLS) | n/a | 8 ms | 0 | n/a | n/a |
| /account | desktop | 11 | 572 ms | 48 ms | **0.397** | 572 ms | 417 ms* |
| /account | mobile | 1 | 144 ms | n/a | n/a | 144 ms | 7 ms |
| /account/kits/[id] | desktop | 17 | 512 ms | 16 ms | **0.305** | 212 ms | 39 ms |
| /account/kits/[id] | mobile | 0 | n/a | n/a | n/a | n/a | n/a |
| / (baseline) | desktop | 101 | 608 ms | 56 ms | 0.0006 | 608 ms | 188 ms |
| / (baseline) | mobile | 11 | 320 ms | 24 ms | 0 | 320 ms | 73 ms |

\* The /account TTFB comes from 8 samples on 15 Oct, launch day. From 16 Oct onward it is 18–31 ms.

Daily desktop P75 CLS (Paris days):
- /kit/[id]: 15 Oct 0.47, 16 Oct 0.27, 18 Oct 0.54, 19 Oct 0.54, 20 Oct 0.54.
- /account: 15 Oct 0.004, 16 Oct 0.78, 18 Oct 0.49, 20 Oct 0.40.
- /account/kits/[id]: 15 Oct 0.28, 16 Oct 0.31, 18 Oct 0.24.

One outlier: on 20 Oct, /account/kits/[id] desktop recorded LCP 4.1 s and TTFB 3.2 s from **one** sample, probably a cold function start or a STALE revalidation. It is not a pattern.

**PostHog** (the `--personal` connector's active project; I did not separately confirm the id is 307574) has **no `$web_vitals` events**: 298 `$pageview` events in 7 days, and the `$web_vitals` event is not in the taxonomy. Web-vitals capture is not enabled in posthog-js, so PostHog cannot give per-pathname vitals. Speed Insights is the only per-metric field source.

### 1b. Lighthouse 12 on prod (lab; the box egresses via iad1)
Reports are in `/workspace/perf/prod/<name>-<mobile|desktop>.report.{json,html}`.

| Page | Form factor | Perf | FCP | LCP | LCP element | TBT | CLS | TTFB |
|---|---|---|---|---|---|---|---|---|
| / | mobile | 87 | 1.0 s | 2.43 s | hero `<p class="mt-5 max-w-2xl …">` | 424 ms | 0 | 4 ms |
| / | desktop | 100 | 0.29 s | 0.50 s | hero `<h1>` | 0 | 0 | 4 ms |
| /kit/AKWq8__P15_kweHmfXX_Uw | mobile | 94 | 0.96 s | 2.64 s | `<h2 id="brief-heading">` | 186 ms | 0 | 4 ms |
| /kit/AKWq8__P15_kweHmfXX_Uw | desktop | 95 | 0.27 s | 0.66 s | `<h2 id="brief-heading">` | 0 | **0.135 (footer)** | 5 ms |
| /kit/S794T0lhkgHPEx9lD-pLzw (sample) | mobile | 95 | 0.96 s | 2.57 s | `<h2 id="brief-heading">` | 157 ms | 0 | 4 ms |
| /kit/S794T0lhkgHPEx9lD-pLzw (sample) | desktop | 95 | 0.27 s | 0.68 s | `<h2 id="brief-heading">` | 0 | **0.135 (footer)** | 4 ms |
| /account (logged out → /login) | mobile | 71 | 1.37 s | 2.92 s | login `<p>` | 168 ms | **0.525** | 4 ms |
| /account (logged out → /login) | desktop | 98 | 0.54 s | 1.04 s | login `<p>` | 0 | 0.004 | 7 ms |
| /account/kits/FZUD… (logged out → /login) | mobile | 59 | 1.37 s | 4.08 s | login page | 205 ms | **0.931** | 3 ms |
| /account/kits/FZUD… (logged out → /login) | desktop | 96 | 0.34 s | 0.60 s | login page | 0 | 0.114 | 5 ms |

Same on every page:
- **JS:** about 395–426 KB of JS transferred in 23–41 files. The largest chunks are `1e5e5s437-m3o.js` at 104 KB (about 64 KB unused at load), `1ghm5fwmgrd4v.js` at 74 KB (about 23 KB unused), `3p4lbspmn2tqr.js` at 57 KB (about 26–30 KB unused) and `01qws2azb_90i.js` at 44 KB. These are shared framework and app chunks, and they are identical on home, which scores 100 on desktop.
- **Render-blocking:** only one CSS file (`22fn-o_2h-27s.css`, 15 KB).
- **Fonts:** 2 Geist woff2 files (23 KB and 29 KB) via next/font with `display: swap`.
- **Images:** none loaded on either kit page. Mobile main-thread time is about 1.5 s.

Real-browser layout-shift capture (Playwright + Chrome, PerformanceObserver, 6 s after load). Output is in `/workspace/perf/cls_kit.json` and `/workspace/perf/cls_more.json`:
- /kit (both kits): one shift, source `FOOTER` y:813→off-screen. Scores: 1440×900 → 0.097, 1920×1080 → 0.247, 2560×1440 → 0.265, 390×844 → 0.
- Logged-out /account and /account/kits/[id]: **HTTP 200, x-vercel-cache: HIT** for the static shell. The streamed body then carries `NEXT_REDIRECT;replace;/login?…;307` plus a `<meta http-equiv="refresh" content="1;url=/login…">` fallback. The redirect is a second document load: 164–573 ms for the /account document, then the /login document. It is not an HTTP 307. Lighthouse folds the skeleton→login swap into its CLS (0.53 and 0.93 on mobile).

## 2. Root cause per route

**/kit/[id] (77, 174 visits)**
- CLS 0.54. `src/app/kit/[id]/page.tsx` wraps `KitView` in `<Suspense fallback={<KitSkeleton/>}>`. `KitSkeleton` (`src/components/kit/kit-skeleton.tsx`) is about 760 px tall, but the real kit is about 3,700 px tall (overview, paywall, newsletter, 30+ checklist rows). So `SiteFooter` sits in the viewport until the dynamic hole resolves (`getKit` + `getSession` + `getDraft` + `resolveKitPromo`, measured 0.5–2.3 s), then jumps. That is about 0.25 per load at 1080p or larger.
- A field value of 0.54, above the single-shift 0.25, means a second shift in the same session window for some visitors. Code-inferred candidates (I could not reproduce them without creating or paying for kits, which the rules forbid):
  - (a) A paid kit landing with `?paid=1`: `GenerationPoller` calls `router.refresh()` as each section lands. Each pending `TaskRow` (a `Skeleton h-12`) is swapped for full text and images, and the poller card is replaced by the "kit is ready" card and `ShipLoopUpsell`. These are all non-input shifts.
  - (b) A fresh preview arriving via `KitPending`, then `router.refresh()`, then the full kit.
- LCP, INP and TTFB are fine: P75 LCP is 784 ms, and the LCP element is the brief `<h2>`, a text node, not an image.

**/account (79)**
- CLS 0.40. Same pattern. `src/app/account/page.tsx` uses a fallback of `<Skeleton className="h-96 rounded-2xl"/>` (384 px), so the footer starts at about y≈520 and is visible on every desktop. It moves when the kit list streams in.
- Behind the skeleton, the server waterfall is about 4–5 sequential Upstash round trips:
  1. `getSession` (cookie only).
  2. `Promise.all([listUserKits → listUserKitIds (2 parallel) → N×getKit, getShipLoop, isLaunchPromoOn])`.
  3. `getProgress` per paid kit.
  4. `hasBillingAccess`, which calls `getShipLoop` again (already fetched) and then `getStoredBillingCustomer`, sequentially.
- No Stripe API call happens on render. Stripe only runs on POST `/api/billing/portal`.
- Logged-out or expired-session hits get the cached shell plus a skeleton, then a client or meta-refresh redirect to /login. That is extra CLS and an extra document load.

**/account/kits/[id] (84)**
- CLS 0.31. The same `KitSkeleton` fallback, the same footer jump, plus the same paid-generation refresh shifts as /kit.
- Data is `getSession` → `Promise.all([getKit, listUserKitIds])`, which is fine.
- The single 4.1 s LCP sample on 20 Oct is an outlier (TTFB 3.2 s).

**Ruled out as causes:**
- Images. No kit or OG image is rendered above the fold. Kit images are raw `<img loading="lazy" width height>` inside checklist rows (`kit-checklist.tsx` L404). The intrinsic width and height prevent CLS. Switching to next/image or WebP would only save bytes when the Assets stage is opened.
- Fonts (next/font, preloaded, swap).
- Third parties. PostHog and Sentry load after `load` + `requestIdleCallback` (`src/instrumentation-client.ts`), and Sentry is imported by named re-exports, so there is no Replay.
- Middleware. `src/proxy.ts` only matches backslash and trailing-slash URLs.
- JS weight. It is the same as on home, which scores 100.

## 3. Top 3 fixes (ranked by impact ÷ effort)

### Fix 1: Keep the footer below the fold while the page streams (all 3 routes). Impact: high. Effort: XS. Safe for a small PR: **yes**.
Add a viewport-height minimum to the page container that wraps the `<Suspense>`. Use the container, not just the skeleton, so the footer stays off-screen even when the real content is short (for example an /account with no kits). The header is `h-14` = 3.5rem.
- `src/app/kit/[id]/page.tsx`: `<div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">` → `<div className="mx-auto min-h-[calc(100svh-3.5rem)] max-w-6xl px-4 py-10 sm:px-6">`
- `src/app/account/kits/[id]/page.tsx`: same change on its outer `div`.
- `src/app/account/page.tsx`: `<div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">` → add `min-h-[calc(100svh-3.5rem)]`.
- Optional: put the same `min-h` on `KitSkeleton`'s root, or make it roughly match the real layout (add a paywall block and a few checklist rows) so the visual swap is calmer.

Expected effect: the footer shift disappears (lab desktop CLS 0.135 → ~0; field about −0.25 per view on ≥1080p screens). This alone should bring /kit and /account/kits CLS into the good or needs-improvement range.

⚠️ **Overlap:** the SEO bot's /kit CLS fix is planned for Wed 21 Oct. This touches the same file (`src/app/kit/[id]/page.tsx` and possibly `kit-skeleton.tsx`). Do one PR covering all three routes, or hand this to that PR so they don't conflict.

### Fix 2: Redirect logged-out /account* at the edge, not from inside the stream. Impact: medium (logged-out and expired-session visits). Effort: S. Safe for a small PR: **yes**, with an e2e check.
In `src/proxy.ts`:
- If `pathname === "/account"` or it starts with `/account/`, and there is no `ll_session` cookie (`SESSION_COOKIE` in `src/lib/auth.ts`), return `NextResponse.redirect(new URL("/login?next=" + encodeURIComponent(pathname + search), request.url), 307)`.
- Add `"/account"` and `"/account/:path*"` to `config.matcher`.

Only check whether the cookie exists. The page's own `getSession()` and redirect stay as the real check for invalid or expired cookies. This removes the 200 shell + skeleton + `NEXT_REDIRECT`/meta-refresh round trip (Lighthouse mobile CLS 0.53/0.93 → ~0; one fewer document load of 160–570 ms). The cost is one edge proxy invocation on /account* only. Rerun the `login`/`magic-link` Playwright e2e tests (`tests/e2e`), because `?next=` encoding must match what `/login` expects.

### Fix 3: Reserve space for sections that fill in after payment (/kit/[id]?paid=1 and /account/kits/[id] while generating). Impact: medium (second shift on paid visits; code-inferred, not reproduced). Effort: M. Safe for a small PR: **mostly**. Verify on a Preview with a mock-paid kit.
- `src/components/kit/kit-checklist.tsx` `TaskRow` pending branch (L323–330): give the pending `<li>` a min-height close to a finished row, for example `min-h-40` instead of `Skeleton h-12`. For image tasks, reserve the image box with `aspect-[1200/630]` from `IMAGE_VARIANTS`.
- `src/components/kit/kit-view.tsx` `PaidKit`: render the "Your launch kit is ready" card and `GenerationPoller` in a wrapper with the same fixed min-height, so swapping one for the other doesn't move the checklist.
- `ShipLoopUpsell` appears only on `?paid=1`. Render it below the checklist, or reserve its height.

Not ranked but cheap, if you're in `src/app/account/page.tsx` anyway: run `hasBillingAccess` inside the first `Promise.all`, or pass it the `shipLoop` already fetched, and kick off `getStoredBillingCustomer` in parallel. That cuts 1–2 Upstash round trips, so the skeleton shows for less time. The RES gain is small because LCP is already 572 ms. Enabling posthog-js `capture_performance: { web_vitals: true }` would give a second per-pathname source if you want one.

## 4. How to rerun (before/after on a Vercel Preview)
Box tooling: Node 20, `/usr/bin/google-chrome-stable`, `lighthouse@12` via npx.

Lighthouse, as run (the script is at `/workspace/perf/run_lh.sh`):
```bash
cd /workspace/perf
BASE=https://launchloop.dev OUT=/workspace/perf/prod ./run_lh.sh
# after, against a preview:
BASE=https://<preview-url> OUT=/workspace/perf/preview ./run_lh.sh
```
Each page is run with:
```bash
export CHROME_PATH=/usr/bin/google-chrome-stable
# mobile (Lighthouse default: Moto G Power emulation, simulated slow 4G)
npx -y lighthouse@12 "$BASE/kit/S794T0lhkgHPEx9lD-pLzw" --only-categories=performance \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
  --output=json --output=html --output-path=/workspace/perf/prod/kit-sample-mobile --quiet
# desktop
npx -y lighthouse@12 "$BASE/kit/S794T0lhkgHPEx9lD-pLzw" --preset=desktop --only-categories=performance \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
  --output=json --output=html --output-path=/workspace/perf/prod/kit-sample-desktop --quiet
```
Pages in the script: `/`, `/kit/AKWq8__P15_kweHmfXX_Uw`, `/kit/S794T0lhkgHPEx9lD-pLzw`, `/account`, `/account/kits/FZUDwAFy5QoIR4zI9K_eYQ` (the last two load logged out).

**Field-like CLS check:** Lighthouse's desktop viewport (1350×940) understates the problem, so also run this at 1920×1080:
```bash
cd /workspace/perf/cls   # playwright-core installed here; script copy at /workspace/perf/cls_capture.mjs
node cls.mjs https://<preview-url>/kit/S794T0lhkgHPEx9lD-pLzw 1920 1080
node cls.mjs https://<preview-url>/kit/S794T0lhkgHPEx9lD-pLzw 2560 1440
```
The target is `"total": "0.000"`, with no `FOOTER` entry. Previews may sit behind Vercel deployment protection. If so, a protection-bypass share link is needed, and I did not touch that setting.

**Field re-check after deploy:** run the same `create_observability_query` (metric `vercel.speed_insights.cls`, aggregation `p75`, groupBy `["route","deviceType"]`, filter `environment eq 'production'`, scope `{type:"project", ownerId:"team_GrXckoyyDLhXTHnZBEDY73i9", projectIds:["prj_J8VLM1iC6va3GhsoqaWHWAOJ2Lv9"]}`, granularity `{days:1}`). With 10–35 samples a week, allow several days before judging.

## Files
- `/workspace/perf/findings.md`: this note.
- `/workspace/perf/prod/*.report.{json,html}`: 10 Lighthouse reports (5 pages × mobile/desktop).
- `/workspace/perf/speed-insights/{lcp,inp,cls,fcp,ttfb,lcp_n,ttfb_n}.json`: raw Speed Insights query results.
- `/workspace/perf/cls_kit.json`, `/workspace/perf/cls_more.json`: layout-shift source captures.
- `/workspace/perf/run_lh.sh`, `/workspace/perf/cls_capture.mjs`: rerun scripts.

## Function region vs Upstash (added 20 Oct, ~19:15 Paris time (CEST))

### Where things run (all read-only)
- **vercel.json:** there is none in the repo (404; the root has no `vercel.json`). So no `regions` is pinned in code. `get_project` returns no `serverlessFunctionRegion` field.
- **Latest prod deployment** `dpl_8gtCPxCeBmHhTjLifJaGf4XRWtgh` (redeploy of 53fdfc9d, created 20 Oct 18:57 Paris time): **`regions: ["iad1", "dub1"]`**. A second function region (dub1) was therefore **added in project settings minutes before this check**, presumably with the Pro upgrade. I changed nothing.
- **Traffic per region (Vercel observability, `vercel.function_invocation.count` by `functionRegion`):** 13:00–17:00 UTC was 100% iad1 (793 invocations). **dub1 first served 12 invocations in the 17:00 UTC hour** (19:00 Paris time), right after that redeploy.
- **Response headers:** a curl from the box (US east) to `/account`, `/kit/S794T0lhkgHPEx9lD-pLzw` and `/api/kits/…/status` returns `x-vercel-id: iad1::iad1::…` (edge iad1, function iad1). Visitors in Europe should now route to dub1, and US visitors stay on iad1.

### Where Upstash is
- **Host:** `src/lib/env.ts` reads `KV_REST_API_URL ?? UPSTASH_REDIS_REST_URL`. Only `UPSTASH_REDIS_REST_URL` is set in the project (prod and preview): `https://enabled-trout-235805.upstash.io`. Tokens not printed.
- **Integration:** Upstash Marketplace integration `icfg_c8R18SIGaXucNCn6mQfX4fMt` (external install). It exposes no region metadata.
- **DNS:** `enabled-trout-235805` → `p2-global.upstash.io` → `global-latency.upstash.io`. This is an **Upstash Global database** behind latency-routed front doors (`global-us1` from a US resolver, `global-euw2` / `global-eu2` from EU subnets). So DNS and IP geolocation identify the nearest front door, **not** the primary region. The box's own resolver returns a fake 198.18.x address, so local DNS was useless and I used DNS-over-HTTPS.
- **Decisive evidence:** Vercel's own outgoing-request telemetry from the prod functions (`vercel.external_api_request.request_duration_ms`, host `enabled-trout-235805.upstash.io`, all from `functionRegion = iad1`, 13–20 Oct):
  - **p50 83 ms** (82 the first week, 85 this week, 93/85 in the last two hours).
  - **Minimum 70 ms**, over about 2M rows read.
  - For comparison, a same-continent call from iad1 is 20–30 ms (`ingest.de.sentry.io` p50 22 ms through Sentry's US relay). An Upstash database in us-east-1 would be 1–5 ms.
  - **A 70 ms floor on every call, reads included, means the database has no replica in the US. It sits across the Atlantic.**
  - A 70 ms floor fits **eu-west-1 (Ireland) → Vercel `dub1`** best. eu-west-2 (London → `lhr1`, about 75 ms) is close behind. eu-central-1 (Frankfurt → `fra1`) would put the floor around 88–90 ms, so it is unlikely.
  - **Confirm in the Upstash console** (Database → Details → Primary Region / Read Regions) before merging. I can't see it without the Upstash account, and I did not use the REST token.
- **Verdict: mismatch.** Since 15 Oct every server-side Redis call has crossed the Atlantic, from iad1 to EU, at about 80 ms each. dub1 is now enabled, but only European visitors reach it. US visitors (134 of 223 Speed Insights page views this week; France is 75) still hit iad1 and pay the full RTT.
- PostHog is also EU (`eu.i.posthog.com`, p50 **290 ms** from iad1). It sits on the /kit path through `resolveKitPromo` → `kitAssignment`, inside the UnlockPanel Suspense. Stripe (133 ms) is called only on POST checkout and billing-portal, never on render.

### Sequential Redis round trips per page (critical path of the streamed hole)
Each `store()` call is one HTTPS `fetch` to the Upstash REST API (`src/lib/store.ts` `RedisRestStore.command`). There is no pipelining. Calls inside a `Promise.all` count as one wave.

| Page | Waves (from the code) | Count |
|---|---|---|
| /kit/[id] unpaid (typical) | `getKit` ∥ `getSession` (cookie) → `getDraft` (meta + every section key, in parallel) | **2** (+ PostHog flags inside the UnlockPanel Suspense; + `getPendingKit` only if the kit is missing) |
| /kit/[id] paid, owner | `getKit` → `getDraft` (if not ready) → `getProgress` | 2–3 |
| /account | (`listUserKitIds` [2 parallel] ∥ `getShipLoop`) → `getKit`×N → `getProgress`×paid kits → `hasBillingAccess` (`getShipLoop` again → `getStoredBillingCustomer`, skipped if a paid kit exists) | **3–4** |
| /account/kits/[id] | `getKit` ∥ `listUserKitIds` → `getDraft` (unpaid, or paid and not ready) and/or `getProgress` (owner) | **2–3** |

`isLaunchPromoOn` (header and /account) is `"use cache"` with a 60 s revalidate, so it is normally off the critical path.

### Estimated gain from co-locating functions with Upstash
At about 78–80 ms saved per wave (83 ms measured p50 → about 3–5 ms in-region):
- **/kit/[id]: about −160 ms** (2 waves), up to −240 ms on paid kits. The UnlockPanel price also arrives about 200 ms sooner, because PostHog EU drops from about 290 ms to about 30–60 ms from dub1.
- **/account: about −240 to −320 ms** (3–4 waves).
- **/account/kits/[id]: about −160 to −240 ms** (2–3 waves).
- **Cold instances** also pay a TLS handshake to Upstash (2–3 extra transatlantic RTTs, about 150–250 ms). `getDraft`'s parallel fan-out can open several connections at once. That cost also shrinks to a few ms in-region.

**What this moves:** these pages are partially prerendered (PPR). The shell comes from the CDN (`x-vercel-cache: HIT/STALE`), so the **Speed Insights TTFB metric barely moves**. The time to the streamed content does move. That includes LCP on /kit, whose LCP element is the brief `<h2>` inside the Suspense hole, and the time the skeleton is on screen. On its own it **does not fix CLS**: the footer still jumps, just sooner. US visitors add about one edge→dub1 hop (~70 ms) for the dynamic stream, which is net positive with 2 or more waves.

### Change (not applied)
Pin a single region that matches Upstash. Add `vercel.json` at the repo root (it overrides the project's iad1+dub1 setting):
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["dub1"]
}
```
- Use `"lhr1"` instead if the Upstash console shows eu-west-2, or `"fra1"` for eu-central-1.
- Alternative: set Function Region to dub1 only in Project Settings → Functions. That is a Vercel settings change, so it needs Lucien's OK.
- **Verify after deploy:** re-run `create_observability_query` with metric `vercel.external_api_request.request_duration_ms`, aggregation `p50`, groupBy `["functionRegion"]`, filter `environment eq 'production' and requestHostname eq 'enabled-trout-235805.upstash.io'`. dub1 should read in single-digit ms. If it reads about 70–90 ms, the database is elsewhere.
- Cheap follow-up in code: replace `getDraft`'s N parallel GETs with one `MGET` (or an Upstash `/pipeline` request), so a page makes one request instead of many even after the move.

### Re-ranked top fixes
1. **Footer min-height (Fix 1 above).** Still #1: it is the only change that removes the CLS that drives the 77/79/84 scores. XS effort, safe. Overlaps with the SEO bot's 21 Oct /kit CLS PR.
2. **Single function region `dub1` (new).** One-file `vercel.json` PR, after confirming the Upstash primary region. Saves about 160–320 ms of server time per page on all three routes, and more on cold starts. Safe for a small PR: **yes**. It is a config-only change and easy to revert. Mind any other EU/US-sensitive dependency: Stripe and Resend are US-hosted but off the render path.
3. **Edge redirect for logged-out /account\* (old Fix 2).**

Moved down to #4: reserve space for sections that fill in after payment (old Fix 3).

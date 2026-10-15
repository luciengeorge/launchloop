# Stripe branding (test mode)

## Done via API
- Portal configuration created: `bpc_1UQqrmQf8ufESneJUU9mxSKC` (active, default)
  - Headline: LaunchLoop billing
  - Privacy / terms URLs pointed at launchloop.dev
  - Features: customer update, invoice history, payment method update, subscription cancel

## Needs Dashboard (test-mode secret keys cannot call Accounts update)
Accounts API branding requires **live** keys (`Only live keys can access this method`).
In Stripe Dashboard (test mode toggle ON):

1. Settings → Branding
2. Business name / display name → **LaunchLoop**
3. Brand color → **#f2541b**
4. Accent color → **#f2541b** (or secondary orange)
5. Icon → upload `public/icons/icon-512.png` (512×512)
6. Logo (optional, for Checkout) → upload a wide mark or the same icon
7. Save

Checkout and Customer Portal pick up account branding automatically once saved.
Portal sessions also pass the portal configuration id explicitly.

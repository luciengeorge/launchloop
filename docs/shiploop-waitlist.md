# Ship Loop waitlist: where signups live

Ship Loop is a free waitlist only (#30). Nothing is sold. This note is for whoever builds the Ship Loop launch email.

## Storage

Signups go through `POST /api/waitlist` (`src/app/api/waitlist/route.ts`) into the key-value store: Upstash Redis in production and on Preview.

- **Per-email record:** `contact:waitlist:<email>`, where `<email>` is trimmed and lowercased. Written by `addContact` (`src/lib/audience.ts`), it holds `email`, `source: "waitlist"`, `createdAt` and, for signups since #30, `tag: "shiploop_waitlist"`, `signup_source` (`ship_loop_page` or `kit_upsell`) and, only when the form sends one, `plan` (`monthly` or `yearly`). The Ship Loop page shows no prices or plans since 19 Oct 2026, and the kit upsell stopped sending `plan` when it moved to the `shiploop_waitlist_ask` kill switch, so signups from either have no `plan`; earlier ones record the billing period they looked at. Older records may lack the newer fields.
- **Set:** `contacts:waitlist` (`WAITLIST_MEMBERS_KEY` in `src/lib/waitlist.ts`), holding the lowercased email of each signup. It **only contains signups made since #30**. Signups from before #30 exist only as `contact:waitlist:<email>` records; they were deliberately not backfilled into the set.

Keys are namespaced per environment (`keyPrefix` in `src/lib/deploy-env.ts`):

| Environment | Record | Set |
| --- | --- | --- |
| Production | `contact:waitlist:<email>` | `contacts:waitlist` |
| Preview | `preview:contact:waitlist:<email>` | `preview:contacts:waitlist` |
| Local development | `dev:contact:waitlist:<email>` (JSON files in `.data`) | `dev:contacts:waitlist` |

## Building the launch list

Read both sources. Neither one is complete on its own.

1. `SMEMBERS contacts:waitlist` (with the environment's prefix).
2. `SCAN` for `contact:waitlist:*` (on Preview, `preview:contact:waitlist:*`; production has no prefix, so the pattern must not also pick up `preview:` or `dev:` keys). Take the `email` field from each record, or the part of the key after `contact:waitlist:`.
3. Lowercase every email and remove duplicates before sending. Most post-#30 signups are in both sources.

Don't use Resend as the source. Its audience/segment is shared with the newsletter (and kit buyers), so it can't tell waitlist signups apart.

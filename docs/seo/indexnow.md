# IndexNow

After each production deploy, the indexable URLs that changed are sent to [IndexNow](https://www.indexnow.org/documentation), which shares them with Bing, Yandex, Seznam, Naver and the other participating engines. Google doesn't use IndexNow; it keeps reading `/sitemap.xml`.

## The key

- The key is `INDEXNOW_KEY` in `src/lib/indexnow.ts`. It is public by design.
- `public/<key>.txt` serves it at `https://launchloop.dev/<key>.txt` as `text/plain`, with the key as the whole body. IndexNow fetches this file to check that we own the host.
- `tests/unit/indexnow.test.ts` fails if the constant and the file drift apart, if an old key file is left in `public/`, or if the proxy starts matching the key path. `tests/e2e/seo.spec.ts` checks that the built site serves the exact key with a 200.
- To rotate the key, change the constant and rename the file in the same commit.

## When it runs

`.github/workflows/indexnow.yml` runs on `deployment_status`. Vercel's GitHub integration creates a GitHub deployment for every deploy (the repo has `Production` and `Preview` environments) and marks it `success` once it is live. The job only runs for a successful `Production` deployment, so the new URLs already answer by then. Preview deploys are skipped.

For that deployment, `scripts/indexnow.mts`:

1. Finds the commit of the previous successful Production deployment through the GitHub Deployments API, then lists the files changed between that commit and the new one. It falls back to the parent commit if the lookup fails.
2. Maps the changed files to public paths (`changedPaths` in `src/lib/indexnow.ts`):
   - `src/app/blog/**`: the post's path plus every parent, so `/blog` is always included.
   - A guide page (`src/app/<guide-slug>/**`, slugs from `GUIDES`) or `src/app/guides/**`: the guide plus `/guides`.
   - `src/app/tools/**`: the tool plus `/tools`.
   - `src/lib/blog.ts`, `src/lib/guides.ts`, `src/lib/tools.ts`: every page in that section, plus its hub.
   - Everything else, including shared layouts and file routes like `/blog/rss.xml`, is ignored.
3. Keeps only paths listed in the live `https://launchloop.dev/sitemap.xml` that answer exactly 200 (redirects don't count). A path that isn't live yet is retried every 15 seconds for up to 2 minutes, then skipped.
4. POSTs at most 100 URLs to `https://api.indexnow.org/indexnow` with `host`, `key`, `keyLocation` and `urlList`, and logs the response code. 200 and 202 are OK. Any other code, or a network error, is logged as a warning and the job still passes. The job runs after the deploy, so it can never block or fail it.

It needs no secrets: the key is public and the workflow's own `GITHUB_TOKEN` (read-only `contents` and `deployments`) is enough.

## Running it by hand

From GitHub: **Actions > IndexNow > Run workflow**, then either:

- fill in **urls** with URLs or paths separated by spaces, commas or new lines, for example `/blog /blog/how-to-launch-on-product-hunt`, or
- tick **all** to send every URL in the live sitemap.

Tick **dry_run** to see the list without sending it. Manual runs use the same sitemap and 200 filter.

Locally (Node 22.18 or later, no `npm ci` needed):

```bash
npm run indexnow -- urls "/blog https://launchloop.dev/faq" --dry-run
npm run indexnow -- all --dry-run
npm run indexnow -- deploy --sha <commit> --dry-run   # diffs against the parent commit locally
```

Drop `--dry-run` to send for real.

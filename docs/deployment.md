# Production deployment and rollback

This guide is deliberately forward-only: never run `supabase db reset` against
a linked or hosted project, never apply the demo seed to production, and never
copy an environment file into Git.

## Pre-flight

Use Node.js 22+ and npm 10+.

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
NEXT_PUBLIC_SITE_URL=https://YOUR_PRODUCTION_DOMAIN CATALOG_DATA_SOURCE=demo npm run build
```

The last command validates the production build shape without credentials. A
real deployment requires the production values below and
`CATALOG_DATA_SOURCE=supabase`.

PowerShell equivalent:

```powershell
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
$env:NEXT_PUBLIC_SITE_URL = 'https://YOUR_PRODUCTION_DOMAIN'; $env:CATALOG_DATA_SOURCE = 'demo'; npm run build
```

## Environment variables

Set these in Vercel Project → Settings → Environment Variables. Use the
Production scope for real secrets; add Preview values only when a Preview must
perform write-flow testing. Do not put a server value in `NEXT_PUBLIC_*`.

| Name                                                      | Scope  | Required                                              |
| --------------------------------------------------------- | ------ | ----------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                    | public | yes; production HTTPS origin only                     |
| `NEXT_PUBLIC_SUPABASE_URL`                                | public | yes                                                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                    | public | yes                                                   |
| `CATALOG_DATA_SOURCE`                                     | server | yes; `supabase` in production                         |
| `SUPABASE_SERVICE_ROLE_KEY`                               | server | yes for leads, delivery and assistant rate limiting   |
| `LEAD_IP_HASH_SECRET`                                     | server | yes; distinct random value, at least 32 characters    |
| `TELEGRAM_BOT_TOKEN`                                      | server | yes for Telegram notifications                        |
| `TELEGRAM_CHAT_ID`                                        | server | yes for Telegram notifications                        |
| `AI_PROVIDER`                                             | server | yes; `fallback` is valid without an external provider |
| `AI_RATE_LIMIT_SECRET`                                    | server | yes; distinct random value, at least 32 characters    |
| `AI_PROVIDER_API_KEY`, `AI_PROVIDER_BASE_URL`, `AI_MODEL` | server | only for `openai-compatible`                          |
| `AI_TIMEOUT_MS`                                           | server | optional                                              |
| `LEGAL_OPERATOR_NAME`                                     | server | required before enabling public lead forms            |
| `LEGAL_OPERATOR_IDNO`                                     | server | required before enabling public lead forms            |
| `LEGAL_OPERATOR_ADDRESS`                                  | server | required before enabling public lead forms            |
| `LEGAL_PRIVACY_EMAIL`                                     | server | required before enabling public lead forms            |
| `LEGAL_RESPONSIBLE_PERSON`                                | server | optional; only for an appointed published contact     |

After applying migrations, schedule
`select * from private.enforce_privacy_retention();` at least daily in
Supabase Cron. Review the production backup and verify the affected row counts
on staging before enabling the schedule.

`NEXT_PUBLIC_SITE_URL` stays the production canonical origin in all production
deployments. In a Vercel Preview or a Vercel Production deployment, POST
endpoints additionally accept only the exact Vercel system deployment origin
when `VERCEL_URL` is supplied by Vercel; no wildcard or client-supplied Host
header is trusted.

## Supabase

1. In Supabase Dashboard → Project Settings → API, verify the Project URL and
   publishable key match the Vercel variables. Obtain the secret/server key
   only for a server-side Vercel variable.
2. In Authentication → URL Configuration, set Site URL to the production
   HTTPS origin. Add localhost and required Preview callback URLs; do not leave
   the production Site URL as localhost.
3. In Authentication → Providers, keep public sign-up disabled. Create the
   first user in Authentication → Users, then assign the database role using
   the procedure in [supabase-setup.md](supabase-setup.md#6-первый-auth-useradmin).
4. Back up the production database, verify the Tehnosklad project ref, then:

   ```bash
   npx supabase link --project-ref YOUR_TEHNOSKLAD_PROJECT_REF
   npx supabase migration list --linked
   npx supabase db push --linked --dry-run
   npx supabase db push --linked
   npx supabase migration list --linked
   ```

   Review the dry run before the push. Do not run seed. Run Security and
   Performance Advisors in Dashboard → Advisors, and run the verification SQL
   only in a controlled environment. Generate types after remote access is
   confirmed with `npx supabase gen types typescript --linked --schema public`;
   review the resulting diff before committing it.

5. In Storage, confirm the migration-created buckets, 5 MiB limit, MIME
   allowlist and admin-only write/delete policies. Test upload/read/delete with
   a disposable unpublished product only.

## Vercel Preview and production

1. Confirm the existing project in Vercel Dashboard → Project → Settings:
   Framework is Next.js, Root Directory is this repository root, Build Command
   is `npm run build`, no custom Output Directory is set, and Node.js uses 22.
2. Link only to that existing project, then inspect variables:

   ```bash
   vercel whoami
   vercel link
   vercel env ls preview
   vercel env ls production
   vercel deploy
   ```

3. Open the returned Preview URL and test `/ru`, `/ro`, catalog, a category,
   a product, search, `/admin` while signed out, sitemap and robots. For a
   controlled write test use a clearly labelled `E2E-STAGE8-<timestamp>` lead;
   verify its database/outbox record and Telegram delivery, then mark it test
   data through the supported admin workflow.
4. Inspect Preview runtime errors/logs. Only after a Ready Preview and passing
   smoke tests deploy production:

   ```bash
   vercel deploy --prod
   ```

5. Reopen the production alias without relying on a local cache and repeat the
   public, unauthenticated admin, lead/Telegram, AI/fallback, sitemap, robots,
   canonical/JSON-LD and mobile checks. A custom domain is added and verified
   in Vercel Dashboard → Project → Settings → Domains; check HTTPS before
   setting it as `NEXT_PUBLIC_SITE_URL`.

## Telegram and AI

Telegram bot setup and chat membership are owner-controlled. Configure the bot
token and chat ID only in Vercel server variables, create one labelled test
lead, and verify the lead remains stored even if delivery is deliberately
unavailable. For an external AI provider, set its server-only values and cost
limits; `AI_PROVIDER=fallback` is the supported no-provider mode.

## Rollback

### Vercel

In Dashboard → Project → Deployments, identify and open the previous Ready
production deployment. Verify it first, then use the deployment menu → Promote
to Production (or the equivalent current CLI promotion command shown by
`vercel promote --help`). Confirm the production alias and inspect Runtime Logs
for errors after the rollback. Do not delete the failed deployment before the
incident is understood.

### Supabase

Migrations are not automatically reversible. Record the migration names,
backup time and target project ref before every push. This repository's stage
migrations are forward-only; use a reviewed compensating migration or restore
from the provider backup when data recovery is required. Do not use remote
reset, migration-history repair, `DROP TABLE`, `TRUNCATE`, or bulk deletion as
a rollback shortcut.

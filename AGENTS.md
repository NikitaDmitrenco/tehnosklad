<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Tehnosklad

Bilingual (RU/RO) appliance catalog + lead platform: Next.js 16.3 App Router storefront, Supabase, Vercel. Requires Node 22.x. Details in `README.md`; admin/lead/security flows in `docs/security.md` and `ADMIN_GUIDE.md`.

## Commands

- `npm run dev` — dev server; root redirects to `/ru` (Romanian at `/ro`)
- `npm run build` — runs `next build --webpack`; keep the `--webpack` flag (integration harness and README both use it)
- Verify after changes: `npm run typecheck && npm run lint && npm run format:check && npm test`
- `npm test` — Vitest unit tests in `tests/` (node env, excludes `tests/integration/`). Integration tests only run through the harness with `vitest.integration.config.mts` — running `vitest` directly will not pick them up.
- `npm run test:e2e` — Playwright; boots its own dev server with `CATALOG_DATA_SOURCE=demo`; no Supabase/Docker needed. Outside CI it **reuses a dev server already on port 3000**, so a stray `npm run dev` on the wrong data source will make e2e fail confusingly
- `npm run test:integration:local` — full harness: requires Docker + a **running** local Supabase stack; runs `supabase/verification/{rls,integrity}.sql` assertions, a fresh **production** build (port 3100), then integration tests. Refuses to run if the stack is linked to a remote project (`supabase/.temp/project-ref`). Slow; never run casually or in CI without the full stack.

## Data source

- `CATALOG_DATA_SOURCE=demo|supabase` picks the catalog backend. Dev/test default to `demo` when unset; **production accepts only `supabase`** — `demo` throws in production.
- Selection lives in `src/features/catalog/data.ts` (demo fixtures in `src/features/catalog/demo-data.ts`).

## Supabase / DB

- Local stack: `project_id = "sklad"`, API `127.0.0.1:54321`, DB `54322`. Start with `npm run db:start`, then `npm run db:reset:local` (applies `supabase/migrations/*.sql` + `supabase/seed.sql`; explicitly local-only). Schema lint: `npm run db:lint:local`.
- `supabase/verification/rls.sql` + `integrity.sql` are executable RLS assertions, not docs — the integration harness runs them against the local DB.
- **Query types are hand-maintained**: `src/features/catalog/supabase/rows.ts`. `npm run db:types:local` generates types but they are NOT auto-synced — after schema changes, reconcile `rows.ts` by hand and re-run typecheck/tests.
- Remote migrations: owner-only, always `npx supabase db push --linked` after a dry run (see `docs/supabase-setup.md`).
- Auth: public signups disabled; admins are manually-created `user_roles` rows (see `docs/supabase-setup.md`).

## Env / security

- Copy `.env.example` → `.env.local` (all `.env*` except the example are gitignored).
- Only `NEXT_PUBLIC_*` reach the browser. `SUPABASE_SERVICE_ROLE_KEY`, `LEAD_IP_HASH_SECRET`, `AI_RATE_LIMIT_SECRET`, Telegram and AI keys are server-only; secrets must be ≥32 chars or runtime validation throws. The assistant runs without a paid provider via `AI_PROVIDER=fallback` (see `.env.example`).
- Env parsing/validation is centralized in `src/lib/env/` — add new variables there, not inline.
- `next.config.ts` enforces a strict CSP (`connect-src 'self' https://*.supabase.co`). The CSP constrains the browser only: a new **client-side** fetch target must be added to it or the browser blocks the request. Server-side fetches (the AI provider call, Telegram delivery) are not subject to the CSP — they are restricted by the env validation in `src/lib/env/` (HTTPS-only in production) instead. Auth, RLS, leads and the assistant are security-sensitive; read `docs/security.md` before touching them.

## Structure

- Routes: `src/app/(entry)/` root → locale redirect; `(public)/[locale]/` storefront; `(backoffice)/admin/` protected admin; `src/app/api/{leads,assistant}/route.ts` endpoints.
- Locales `ru` (default) + `ro`; dictionaries in `src/i18n/dictionaries/{ru,ro}.ts`.
- `src/proxy.ts` (Next.js proxy/middleware) refreshes admin sessions and sets the `x-tehnosklad-pathname` header.
- Feature logic lives in `src/features/{catalog,leads,admin,assistant,seo}/`. Supabase clients in `src/lib/supabase/`: `server.ts` (SSR, user cookies), `proxy.ts` (cookie refresh), `public-server.ts` (publishable key), `service.ts` (service-role, server-only, deliberately not barrel-exported), `browser.ts` (client-side, publishable key). Admin CRUD intentionally does **not** use the service-role client — it goes through atomic `admin_*` RPCs under RLS.
- The `sklad/` directory at the repo root is an imported archive, excluded from git, eslint, tsconfig and prettier — leave it alone.

## Style

- Prettier: semicolons, double quotes, trailing commas (`.prettierrc.json`). Dependencies are mostly pinned to exact versions (`@playwright/test` and `vitest` are caret ranges).

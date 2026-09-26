<div align="center">

# 🏠 Tehnosklad

### Bilingual appliance catalog + lead platform for Moldova

A production-oriented full-stack storefront with a public RU/RO catalog, protected administration, Supabase data, Telegram lead delivery and a grounded catalog assistant.

[![Open live site](https://img.shields.io/badge/Open_live_site-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://tehnosklad123.vercel.app/)

![Next.js](https://img.shields.io/badge/Next.js-16.3-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white)

</div>

---

## What Tehnosklad does

Tehnosklad is not only a product grid. It models the complete path from catalog discovery to an operator-managed customer lead.

```text
Discover → Search / filter → Inspect product → Contact → Store lead → Deliver to Telegram → Manage in admin
```

## Customer experience

- 🇷🇺 / 🇷🇴 Russian and Romanian storefront
- 🔎 URL-driven search, filters, sorting and pagination
- 🧩 categories, subcategories and configurable attributes
- 🔗 stable localized product URLs with historical-slug redirects
- 🖼 product/category media
- 📱 responsive UI
- 🔍 canonical URLs, `hreflang`, JSON-LD, sitemap, robots and Open Graph
- 🤖 grounded catalog assistant

## Lead pipeline

The lead flow includes:

- localized forms;
- product context;
- server-side validation;
- honeypot protection;
- rate limiting;
- idempotency;
- durable storage;
- Telegram outbox/history;
- audited retry/requeue behavior.

## Administration

Protected `/admin` tooling covers:

- dashboard;
- categories and subcategories;
- attribute builder;
- product CRUD;
- images/media;
- customer leads;
- assistant knowledge base and request statistics;
- public site settings;
- storage / metadata reconciliation.

## Grounded AI assistant

The assistant is designed around **published catalog context**, not free-form access to private application data.

A deterministic fallback can run without a paid external AI provider:

```env
AI_PROVIDER=fallback
```

Store policies — delivery, payment, warranty, returns — come from a bilingual knowledge base (`assistant_knowledge`) that admins edit at `/admin/assistant-knowledge`; the assistant answers from those articles instead of inventing terms, and anonymous request telemetry is summarized at `/admin/assistant-logs`.

Customer lead records are not passed into assistant context.

## Architecture

```mermaid
flowchart LR
    C[Customer] --> WEB[Next.js storefront]
    A[Admin] --> ADM[/admin]
    WEB --> DATA[Server data layer]
    ADM --> DATA
    DATA --> DB[(Supabase PostgreSQL)]
    DATA --> ST[Supabase Storage]
    WEB --> LEAD[Lead endpoint]
    LEAD --> DB
    LEAD --> TG[Telegram outbox]
    WEB --> AI[Grounded assistant]
    AI --> PUB[Published catalog]
```

## Tech stack

| Area           | Technology                |
| -------------- | ------------------------- |
| Framework      | Next.js 16.3 / App Router |
| UI             | React 19                  |
| Language       | TypeScript 5.9            |
| Styling        | Tailwind CSS 4            |
| Database       | Supabase PostgreSQL       |
| Authentication | Supabase SSR Auth         |
| Storage        | Supabase Storage          |
| Tests          | Vitest + Playwright       |
| Deployment     | Vercel                    |

## Quick start

Requires Node.js 22.x and npm 10+.

```bash
git clone https://github.com/xondell/tehnosklad.git
cd tehnosklad
npm ci
cp .env.example .env.local
```

Demo mode:

```env
CATALOG_DATA_SOURCE=demo
```

Run:

```bash
npm run dev
```

The root redirects to `/ru`; Romanian is available at `/ro`.

## Local Supabase

A Docker-compatible runtime is required.

```bash
npm run db:start
npm run db:reset:local
```

Then configure `.env.local` and use:

```env
CATALOG_DATA_SOURCE=supabase
```

See `docs/supabase-setup.md`.

## Validation

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:e2e
npm run build
```

Database tooling:

```bash
npm run db:start
npm run db:reset:local
npm run db:lint:local
npm run db:types:local
npm run test:integration:local
npm run db:stop
```

## Security model

The project includes:

- Row Level Security;
- explicit grants;
- server-only privileged operations;
- admin role re-checks;
- atomic RPCs;
- media validation;
- lead rate limiting and idempotency;
- privacy-preserving HMAC identifiers;
- assistant rate limiting;
- retention procedures;
- durable Telegram delivery state.

## Repository map

```text
tehnosklad/
├── docs/                  # Architecture, security and deployment documentation
├── e2e/                   # Playwright tests
├── scripts/               # Integration / build helpers
├── src/                   # Next.js application
├── supabase/
│   ├── migrations/        # Versioned production schema
│   ├── verification/      # RLS assertions
│   └── seed.sql           # Deterministic seed data
├── ADMIN_GUIDE.md
├── .env.example
└── package.json
```

## Production note

Before enabling real customer leads, configure the operator's verified legal/company details through the documented `LEGAL_*` variables. The repository intentionally avoids inventing legal identities.

---

<div align="center">

**Tehnosklad — catalog UX backed by a real data, admin and lead-delivery system.**

</div>

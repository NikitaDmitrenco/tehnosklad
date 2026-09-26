# Roadmap Tehnosklad

## Этап 1 — архитектура и каркас — завершён

Коммит `9e52bac`.

## Этап 2 — публичная demo-витрина — завершён

Коммит `8a250f6`. Адаптивный RU/RO storefront, каталог, карточки, контакты и форма без серверной отправки.

## Этап 3 — Supabase foundation — завершён

- Официальные migrations/config/seed.
- Нормализованный каталог, money minor units, strict RU/RO.
- Явные grants, RLS, Storage bucket и verification matrix.
- Server-only repository с Supabase/demo source selection.
- Реальные server reads для home/catalog/category/product/similar/settings.
- Supabase SSR Auth, `proxy.ts`, admin role guard, login/logout и защищённый shell.
- Mapper/repository/security/env unit tests.

Подробности: [stage-3.md](stage-3.md).

## Этап 3.5 — Supabase runtime validation — завершён

- Clean migration/seed и повторные local reset.
- DB lint и executable schema/RLS/integrity assertions.
- Реальные Auth/JWT/RLS/Storage/repository/production HTTP tests.
- Local-only harness с защитой от remote target.

Подробности: [stage-3-runtime-validation.md](stage-3-runtime-validation.md).

## Этап 4 — каталог и SEO — завершён

- URL/server query для поиска, фильтров, сортировки и пагинации.
- Localized metadata, canonical/hreflang, Schema.org, sitemap/robots и OG images.
- Redirect history для безопасной будущей смены опубликованных slug.
- Типизированные cache tags и on-demand invalidation foundation.

Подробности: [stage-4.md](stage-4.md).

## Этап 5 — заявки и Telegram — завершён

- Валидируемый same-origin server endpoint, 16 KiB limit, honeypot, rate limit и UUID idempotency key.
- Leads/status history/Telegram outbox и delivery attempts отдельной migration.
- Сохранение заявки до Telegram delivery, snapshot опубликованного товара и безопасная классификация retry/uncertain failures.
- Реальная доступная RU/RO форма, product/source context и сохранение введённых данных при ошибке.
- Unit, transactional SQL, production HTTP integration и desktop/mobile browser QA.

Подробности: [stage-5.md](stage-5.md).

## Этап 6 — административный CRUD — завершён

- Защищённый responsive admin shell и dashboard.
- CRUD категорий, групп/характеристик/options/category bindings и товаров со strict RU/RO и publication invariants.
- Storage upload/delete workflow, metadata compensation, orphan reconciliation и точечная cache invalidation.
- Фильтруемые заявки с immutable snapshot/history/read-only Telegram delivery и сменой статуса.
- Публичные настройки только по закрытому whitelist.
- Unit, SQL и local production integration coverage для полного admin-среза.

Подробности: [stage-6.md](stage-6.md).

## Этап 7 — AI-ассистент — завершён

Grounded provider interface, отдельный HMAC rate limit, короткая in-memory история и deterministic fallback-поиск. См. [stage-7.md](stage-7.md).

## Этап 8 — production hardening/deploy

E2E, SEO, legal review, performance, CSP, backup/restore drill, Vercel smoke test и наблюдаемость.

# Этап 3 — Supabase, data layer и Auth

## Результат

Этап переводит storefront с прямых imports demo fixtures на стабильный repository contract. В development/test demo остаётся полноценной реализацией; при `CATALOG_DATA_SOURCE=supabase` страницы читают опубликованный каталог серверным publishable client под RLS.

Сохранены дизайн, mobile layout, RU/RO, пустые состояния и CSS media fallback. Добавлены динамические attribute-фильтры, route-aware alternate slug, реальные Storage image DTO, availability `on_order`, integer minor-unit money и public site settings.

## Schema

Migration создаёт:

- `profiles`, `user_roles`;
- categories/products и RU/RO translations;
- product images и localized alt;
- attribute groups/attributes/options/category bindings/product values;
- localized text values характеристик;
- публичный whitelist `site_settings`;
- private integrity/role functions, triggers, indexes, RLS/grants;
- bucket `product-images` и admin-only write policies.

AI и lead/Telegram таблицы удалены из production scope: их контракт ещё не утверждён. Старый `supabase/schema.sql` сохранён только как исторический draft; production source of truth — `supabase/migrations/`.

## Seed

`supabase/seed.sql` предназначен для чистой локальной БД и содержит:

- 3 published категории;
- 12 published товаров с ценами/status/popular/new;
- RU/RO names/descriptions/slugs;
- 3 динамические характеристики на товар;
- локализованные feature values без русского текста на RO;
- безопасные public settings;
- никаких Auth users, паролей или secrets.

Seed намеренно не создаёт metadata для отсутствующих Storage objects: изображения используют существующий CSS placeholder, пока admin upload UI не создаст реальный object и согласованную DB metadata в одной операции. Это безопаснее, чем seed URL на несуществующие файлы.

## Data source policy

- `demo`: локальные fixtures через `DemoCatalogRepository`.
- `supabase`: publishable server client, RLS и bulk transport.
- Development/test без значения env выбирает demo.
- Production принимает только явный `supabase`; отсутствующий source и `demo` завершаются ошибкой конфигурации.
- Supabase error никогда не приводит к demo fallback и не смешивает источники.

## Проверки в среде этапа

Подтверждены TypeScript, ESLint, Prettier, unit tests и production build. Public shell request-rendered, поэтому build не обращается к Supabase; runtime production всё равно требует source `supabase`. Supabase CLI 2.111.0 установлен локально и migration создан штатной CLI-командой.

На исходном Этапе 3 Docker отсутствовал, поэтому runtime-проверки тогда не выдавались за выполненные. Позднее Этап 3.5 применил migration/seed на чистой локальной базе, выполнил повторные reset, DB lint и реальные RLS/Auth/Storage/repository/production HTTP-сценарии. Результаты: [stage-3-runtime-validation.md](stage-3-runtime-validation.md).

## Осознанные ограничения

- Catalog filters применяются локально к уже загруженному небольшому published dataset; server-side faceted search понадобится только при росте каталога.
- Unknown category/product slug обслуживается on demand; build не зависит от remote slug list.
- Language switch на category/product использует `alternateSlug`; прочие маршруты меняют только locale segment.
- Нет admin CRUD или upload UI.
- Нет leads/Telegram/AI schema или endpoints.
- Public Storage bucket не подходит для секретных draft media.

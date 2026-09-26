# Этап 6 — защищённый административный CRUD

## Результат

Этап добавляет рабочую административную панель без client-side доверия и фиктивных действий. Каждый `/admin` route остаётся request-rendered, получает `Cache-Control: private, no-store`, а protected layout, Server Action, repository read и mutation RPC независимо проверяют активную роль `admin`.

Основные маршруты:

- `/admin` — количество товаров/категорий/новых заявок, наличие, последние заявки и Telegram failures;
- `/admin/categories` — список, RU/RO, локализованные slug, parent, presentation key, порядок, публикация и безопасный archive/unarchive;
- `/admin/attribute-groups` — двуязычные группы, порядок и active state;
- `/admin/attributes` — тип, RU/RO имя/help/unit, options, category bindings, required/filterable/order;
- `/admin/products` — поиск и фильтры, draft/create/edit/archive, MDL, availability, flags, RU/RO, SEO, preview, характеристики и изображения;
- `/admin/leads` — фильтры status/source/locale/product/date, поиск имени/телефона, CSV, detail, immutable snapshot/history и смена статуса;
- `/admin/settings` — только семь существующих публичных ключей RU/RO;
- `/admin/media/orphans` — проверяемая сверка Storage objects и metadata.

## Mutation boundaries

UI использует Server Components по умолчанию. Client Components ограничены active/mobile navigation, pending submit и явным подтверждением опасных действий.

Mutation проходит четыре слоя:

1. Server Action вызывает `requireAdmin()` до разбора изменяемых данных.
2. `src/features/admin/validation.ts` нормализует UUID, slug/code, integer, enum, переводы, money и файлы.
3. Atomic `admin_*` RPC работает как `SECURITY INVOKER`, снова вызывает `private.is_admin()`, подчиняется RLS/grants и DB constraints.
4. После commit инвалидируются доменные tags и admin paths; результат возвращается 303 redirect с безопасным кодом.

Service-role client не используется административным CRUD. Он остаётся только в доверенной server-only границе публичных заявок/Telegram outbox. Browser не получает SQL errors, stack trace, cookies или секреты.

Категория и товар сначала записываются как draft, затем translations/поля и запрошенное состояние публикации фиксируются в одной транзакции. Deferred constraints проверяют итоговое состояние: опубликованную категорию/родителя, strict RU/RO, required attributes, активную metadata options/groups и RU/RO alt у каждого существующего изображения. Изменение опубликованного slug продолжает записывать route history Этапа 4 и даёт HTTP 308.

## Характеристики

Конструктор поддерживает `text`, `number`, `boolean`, `single_select`, `multi_select`, `color`. Select options имеют RU/RO labels; color хранится canonical `#RRGGBB`. Привязка к категории управляет required/filterable/sort order.

DB отклоняет:

- filterable text attribute;
- смену типа при существующих values или options;
- option для non-select type или option другого attribute;
- повтор одного option в multi-select;
- удаление group/attribute/option/binding, пока они используются;
- смену категории товара, если сохранённые attributes несовместимы.

Полная замена значений товара атомарна: ошибка любого значения откатывает предварительное удаление старого набора.

## Деньги

UI принимает строку MDL с максимум двумя десятичными знаками. Conversion выполняется строковой арифметикой в `bigint`; JavaScript float не участвует. PostgreSQL хранит `price_minor bigint`, `old_price_minor bigint`; старая цена обязана быть строго выше текущей.

## Storage workflow

Upload:

1. server проверяет размер `<= 5 MiB`, MIME, extension и magic bytes;
2. extension канонизируется, path генерируется как `<product_uuid>/<random_v4_uuid>.<ext>`;
3. upload идёт только в фиксированный `product-images` с `upsert:false`;
4. после object upload RPC атомарно создаёт metadata и оба alt;
5. при metadata error Server Action удаляет загруженный object; неудачная compensation получает безопасный server log code и обнаруживается orphan scan.

Delete использует `mark -> Storage remove -> finalize`. Marker снимает primary и скрывает metadata публичной RLS policy. При Storage error marker отменяется. Если процесс оборвался, reconciliation показывает `pending_metadata`; object без row отображается как `orphan_object`, row без object — `missing_object`. Любое действие повторно запускает authoritative scan и сравнивает path/state, поэтому устаревшая browser-форма не является источником истины.

Scan намеренно ограничен 1000 product folders и 1000 objects в folder, что соответствует практическому объёму бесплатного тарифа. При росте каталога нужен paginated maintenance job; это известное операционное ограничение, не скрытая автоматическая очистка.

## Заявки и Telegram

Администратор видит сохранённые контактные данные, authoritative snapshot товара, status history, delivery state, attempts, HTTP status и безопасные error codes. Разрешены только переходы в `new`, `in_progress`, `contacted`, `closed`, `spam`; trigger пишет `changed_by=auth.uid()`.

Имя, телефон, source, locale, consent, комментарий и product snapshot остаются immutable. Администратор может повторно поставить неуспешную Telegram delivery в очередь. Для `manual_review` UI требует отдельное подтверждение риска дубликата: неопределённая предыдущая попытка могла быть принята Telegram. Retry создаёт новую generation попыток и не переписывает delivery history.

CSV формируется защищённым admin Route Handler. Значения, начинающиеся с `=`, `+`, `-` или `@`, экранируются от spreadsheet formula injection.

## Публичные настройки

Редактируются только `phone_display`, `phone_href`, `address`, `open_days`, `open_time`, `closed_day`, `contact_text`. RPC обновляет существующую RU/RO пару атомарно. Создать key, изменить locale, удалить row, сохранить Telegram token/service role или превратить secret в public невозможно: таких колонок/ключей нет в whitelist, а authenticated grant ограничен `UPDATE(value)`.

## Cache invalidation

- category: `catalog`, `categories`, `products`;
- product/image: `catalog`, `products`;
- attribute/group/option/binding: `catalog`, `categories`, `products`;
- site setting: `site-settings`;
- leads: только admin paths.

Product/category slug history triggers продолжают обеспечивать 308 после invalidation. Draft preview доступен только через защищённый `/admin/products/:id/preview/:locale`; публичный draft URL не раскрывается.

## База данных

Migration `20260805213001_stage_6_admin_crud.sql` добавляет:

- `product_images.deletion_pending_at` и partial index;
- category cycle/tree publication guards;
- дополнительные type/option/multi-select/FK integrity guards и индексы;
- atomic admin RPC для categories, groups, attributes/options/bindings, products/values/images, lead status и settings;
- explicit EXECUTE grants только `authenticated`, внутренний active-admin guard;
- value-only grant на `site_settings` и public image policy без deletion-pending rows.

Старые migrations не изменялись.

## Тесты и проверка

Unit coverage включает validation форм, string→minor-unit conversion, authorization first, cache invalidation, safe error mapping, DTO mapping, Storage MIME/magic/size/path.

SQL verification проверяет RLS admin/non-admin, Stage 6 RPC grants, publication invariants, category cycle, option type, immutable lead fields/status history и FK indexes. Local production integration создаёт active/non-admin/inactive Auth users и проходит category → required attribute → draft product → RU/RO → upload → publish → storefront/revalidation/308 → lead status → settings → image delete → archive, после чего удаляет все test entities.

Полный прогон:

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
npm run db:start
npm run db:reset:local
npm run db:lint:local
npm run test:integration:local
npm run build
npm run db:stop
```

Integration harness требует явный `--local-only`, запрещает linked project/non-local URLs, очищает cloud credentials в дочерних процессах и сначала выполняет `rls.sql`/`integrity.sql`. Remote migration/reset/deploy/push он не выполняет.

## Известные ограничения

- Ручная повторная Telegram-доставка несёт риск дубликата после `manual_review`; она требует явного подтверждения администратора и должна использоваться только после ручной проверки чата.
- Категории и товары архивируются, а не hard-delete; используемые attribute entities удалять нельзя.
- Orphan scan имеет описанный лимит 1000×1000 и запускается вручную.
- Admin UI русскоязычный; управляемый публичный контент всегда требует RU и RO.
- AI-ассистент не входит в Этап 6 и остаётся задачей Этапа 7.

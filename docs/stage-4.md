# Этап 4 — каталог и SEO

Этап завершает переход каталога от client-only фильтрации к воспроизводимым серверным URL и добавляет основу SEO, безопасной смены slug и будущей cache invalidation.

## URL-контракт каталога

Канонические страницы категорий остаются отдельными маршрутами `/{locale}/category/{slug}`. Каталог и категория принимают одинаковые GET-параметры:

- `q` — поиск по локализованному имени, бренду, модели и SKU;
- `brand`, `availability`, `price_min`, `price_max`;
- `attr_{code}` — AND-фильтры по каноническим значениям характеристик;
- `sort` — `popular`, `new`, `price_asc`, `price_desc` или `name`;
- `page` — серверная пагинация по 9 товаров.

Значения нормализуются и сериализуются в стабильном порядке. Defaults и некорректные параметры удаляются из канонического URL. Старый `/{locale}/search` делает постоянный redirect в каталог с сохранением нормализованного запроса. Переключатель языка сохраняет query string.

Фильтрация и подсчёт выполняются одной RPC `search_public_catalog_product_ids`; она возвращает только ID текущей страницы плюс полный `total_count`. DTO и характеристики загружаются лишь для этих ID, а repository восстанавливает порядок RPC.

Сами доступные фильтры (бренды, наличие, границы цены, значения атрибутов) собирает `SECURITY INVOKER` RPC `get_public_catalog_facets(p_locale, p_category_id)`: она наследует RLS вызывающей роли и отдаёт готовый JSON-документ. Раньше фасеты считались в приложении, из-за чего страница каталога читала весь опубликованный каталог вместе со всеми значениями атрибутов — стоимость росла вместе с магазином, а ответ молча обрезался на `db.max_rows`. Значения фильтров в RPC выражение в выражение совпадают с тем, что понимает поиск; порядок брендов и опций задаёт приложение, чтобы он не зависел от collation базы.

## Индексация и structured data

- Все локализованные страницы формируют canonical, `ru`/`ro` hreflang и `x-default`.
- Поиск и активные фильтры получают `noindex, follow`; чистая пагинация остаётся индексируемой со своим canonical.
- Home публикует `Store` и `WebSite`; коллекции — `CollectionPage`, `ItemList` и breadcrumbs; товар — `Product`, `Offer` и breadcrumbs.
- JSON-LD сериализуется с экранированием символов, способных закрыть `<script>`.
- `robots.txt`, динамический `sitemap.xml` и стабильные локализованные PNG по `/{locale}/opengraph-image` создаются через App Router.
- Черновые legal pages исключены из sitemap и получают `noindex` до юридического утверждения.

`NEXT_PUBLIC_SITE_URL` обязан быть чистым origin без credentials, path, query или hash. Он используется как `metadataBase` и источник абсолютных Schema.org/sitemap URL.

## История slug

Migration `20260805190000_stage_4_catalog_seo.sql` добавляет `category_slug_routes` и `product_slug_routes`. Триггеры на переводах поддерживают ровно один current slug для entity/locale, а предыдущие значения сохраняют как history.

Публичным ролям видны только исторические маршруты опубликованных сущностей. Current URL читается через translation; старый URL разрешается через history и получает HTTP 308 сразу на актуальный slug без цепочки redirect. Прямые изменения route-таблиц зарезервированы для `service_role`/trigger workflow; внешние ключи `RESTRICT` не позволяют случайно удалить SEO-историю вместе с сущностью.

## Cache invalidation foundation

Публичные cached reads используют теги `catalog`, `categories`, `products` и `site-settings`. `revalidateCatalogAfterMutation(scope)` содержит единственное отображение будущих admin mutations в затронутые теги и вызывает `revalidateTag(tag, { expire: 0 })`. Этап 4 не добавляет CRUD, поэтому helper будет подключаться только после успешной mutation в соответствующем вертикальном срезе.

## Проверки

- TypeScript, ESLint и 45 unit tests.
- Clean local migration/seed и DB lint без ошибок.
- Transactional `rls.sql` и `integrity.sql`, включая 20 public tables, 40 policies, backfill 6 category/24 product routes, grants и draft-safe RPC.
- 13 production integration tests: Auth/JWT/RLS/Storage, RU/RO routes, server search/pagination, draft exclusion, historical 308 redirects, metadata, JSON-LD, robots, sitemap и Open Graph PNG.

Заявки и Telegram остаются этапом 5; admin CRUD и вызовы cache invalidation после mutations — этапом 6.

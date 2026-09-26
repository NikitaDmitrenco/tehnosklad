# Архитектура Tehnosklad

## Границы

- React Server Components используются по умолчанию.
- Публичные URL всегда содержат `/ru` или `/ro`.
- `/admin` имеет отдельный root layout, Auth proxy и защищённую route group.
- UI не импортирует Supabase и demo fixtures. Все чтения идут через `CatalogRepository`.
- Browser, user-server, public-server и service-role clients разделены по доверительным зонам.
- Service role находится в отдельном leaf module с `server-only` и не экспортируется через barrel.

## Data flow каталога

```text
Public page (Server Component)
  -> cached query function (locale является аргументом/cache key)
    -> CatalogRepository
      -> DemoCatalogRepository (явный local/test режим)
      -> SupabaseCatalogRepository
        -> SupabaseCatalogTransport (bulk queries)
          -> mapper DB rows -> locale-resolved domain DTO
            -> UI components / CatalogClient local filtering
```

Supabase transport получает списки товаров одним bulk query и характеристики вторым bulk query. Slug lookup использует точечную цепочку translation→id→entity, а similar применяет category/exclude/limit до bulk-запроса характеристик. Запросов на товар/атрибут в цикле нет. DB row shapes остаются в `features/catalog/supabase`; компоненты получают только `CatalogProduct`, `CatalogCategory`, `CatalogFacets` и `PublicSiteSettings`.

## Доменные решения

- Деньги: integer minor units (`priceMinor`), валюта фиксирована как MDL.
- Переводы: strict. Для опубликованной сущности обязательны RU и RO; mapper не подставляет другой язык.
- Slug локализован в БД и уникален внутри locale. Domain DTO содержит текущий и alternate slug.
- Публикация, availability, archive, popular и new независимы.
- Характеристики нормализованы по group/attribute/type/options/value. DTO отделяет локализованный `displayValue` от canonical `filterValue`; category binding может переопределить filterability/sort. UI строит динамические facets для canonical number/boolean/select/color; локализованный free-text намеренно не может быть filterable.
- Для category/product proxy передаёт только pathname в request header, layout точечно резолвит alternate slug и уже в SSR формирует правильный language-switch href.
- Реальные Storage images опциональны; при отсутствии изображения сохраняется CSS fallback Этапа 2.

## Рендеринг и cache

- Public locale shell и все public страницы request-rendered (`force-dynamic`), поэтому build не требует доступного remote Supabase и не замораживает demo-data в production artifact.
- Category/product slug обслуживаются on demand.
- Публичные repository queries кэшируются на 300 секунд. Все locale/slug/category параметры входят в ключ.
- Admin mutations инвалидируют tags `catalog`, `products`, `categories`, `site-settings` по доменному scope; admin pages дополнительно revalidate свои paths.
- `/admin` и `/admin/login` — `force-dynamic`; auth responses получают `private, no-store`.

## Auth flow

1. Лёгкий `src/proxy.ts` исключает static assets. На public routes он только передаёт pathname для SSR locale links; на `/admin/:path*` вызывает `getClaims()` для refresh/оптимистического redirect и синхронизирует cookies/anti-cache headers.
2. Login Server Action вызывает `signInWithPassword` пользовательским SSR client.
3. После входа сервер запрашивает свежего пользователя через `getUser()` и читает собственные `profiles`/`user_roles` под RLS.
4. Protected layout и dashboard повторно вызывают `requireAdmin()`.
5. RLS остаётся последней линией защиты будущих catalog mutations.

Proxy не запрашивает роль из БД и не является единственной защитой.

## Admin mutation flow

```text
Admin Server Component
  -> requireAdmin() + user-scoped Supabase reads under RLS
    -> Server Action (повторный requireAdmin + server validation)
      -> SECURITY INVOKER admin_* RPC (private.is_admin + RLS + DB constraints)
        -> cache tag/path invalidation
          -> 303 redirect с санитизированным result code
```

Atomic RPC не используют service role и временно оставляют сущность draft при сохранении переводов/полей, затем включают публикацию в той же транзакции. Deferred publication triggers проверяют итоговое состояние. Сырые SQL errors не переходят в URL/UI.

Изображение проходит отдельную границу: Server Action валидирует фактическую сигнатуру/MIME/размер, генерирует immutable path, загружает object с `upsert:false`, затем создаёт metadata через RPC. Ошибка metadata вызывает compensating Storage delete. Удаление использует `mark -> object delete -> finalize`; экран `/admin/media/orphans` повторно сканирует Storage перед любой сверкой.

## Data flow заявки

```text
ContactDialog
  -> POST /api/leads (same-origin JSON + Idempotency-Key)
    -> shared canonical validation
      -> HMAC request/IP/phone hashes
        -> service-role submit_public_lead RPC
          -> lead + initial status history + Telegram outbox (одна транзакция)
            -> claim delivery lease
              -> Telegram Bot API
                -> complete delivery attempt/result
```

Браузер передаёт только `productId`; имя, цена и URL товара заново разрешаются RPC из опубликованного RU/RO каталога и сохраняются snapshot-полями. Клиент не имеет Data API grants на leads и не получает service role. Повтор одного запроса с тем же UUID и canonical payload возвращает существующую заявку, а тот же UUID с другим payload отклоняется.

Telegram не участвует в транзакции сохранения заявки. Явный `429` может перейти в `retry_wait`; сетевой timeout, `5xx` и просроченная processing lease считаются неопределённым исходом и переводятся в `manual_review`, чтобы автоматический повтор не создал дубликат сообщения.

## Структура

```text
src/
  app/(public)/[locale]/
  app/(backoffice)/admin/login/
  app/(backoffice)/admin/(protected)/
  features/catalog/
    data.ts, repository.ts, demo-repository.ts
    supabase/{transport,repository,mapper,rows}.ts
  features/admin/auth/
  features/admin/{actions,repository,validation,mapper,types}.ts
  components/admin/
  features/leads/
  app/api/leads/route.ts
  lib/env/
  lib/supabase/{browser,server,public-server,service,proxy}.ts
  proxy.ts
supabase/
  config.toml
  migrations/
  seed.sql
  verification/
```

## Следующие внешние границы

AI Route Handler и provider interface появятся только после определения контракта; прямой anon INSERT ни для заявок, ни для AI-истории не предусматривается.

# Grounded assistant boundary

`src/features/assistant` is server-only except the UI widget. Route validation → HMAC rate-limit RPC → bounded public catalog search → `AssistantProvider` → response normalization. The fallback and product references are deterministic and do not rely on a provider response.

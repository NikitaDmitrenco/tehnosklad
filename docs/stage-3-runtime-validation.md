# Этап 3.5 — runtime-валидация Supabase

Дата проверки: 5 августа 2026 года.

## Результат

Production migration и детерминированный seed фактически применены в локальном
Supabase stack. Выполнено больше двух clean reset, database lint, SQL contract
assertions, реальные JWT/RLS/Auth/Storage-сценарии, проверка Supabase repository,
RU/RO storefront и production server. Remote Supabase не подключался.

Этап 3.5 завершает проверку foundation Этапа 3. Следующий этап намеренно не
начат.

## Исправленные проблемы

- Storage metadata теперь требует два канонических versioned UUID и тот же
  whitelist расширений, что и Storage INSERT policy.
- Добавлены полноценные reverse-FK индексы для `categories.parent_id`,
  `products.category_id`, `category_attributes.attribute_id` и
  `product_attribute_values.attribute_id`.
- Default privileges отозваны для будущих tables/sequences и глобально для
  будущих функций роли `postgres`; отдельный runtime probe доказывает, что
  новая функция в `private` не исполняется Data API ролями.
- `rls.sql` заменил диагностические counts на настоящие assertions для seed,
  draft leakage, child rows, grants и anon/authenticated non-admin.
- `integrity.sql` проверяет полный inventory public tables, PK, FK и RLS,
  а также inventory policies, выбранные grants, обязательные индексы,
  default ACL и Storage bucket; затем
  также positive/negative integrity controls.
- Публичная env-валидация отклоняет `sb_secret_*`, legacy JWT с
  `role=service_role` и ключ, совпадающий с server-only service key.
- Supabase transport дополнительно фильтрует published/non-archived rows даже
  после успешной проверки publishable key.
- Визуальный tone категории выбирается по `presentation_key`, а не по demo ID.
- Добавлен `npm run test:integration:local` с обязательным `--local-only`,
  localhost/port checks, запретом linked project и проверкой локальных env
  файлов до получения service credentials. Harness сам создаёт свежий
  production build под проверенным local-only environment перед HTTP-тестами.

Runtime также обнаружил и устранил проблемы, которых не было видно статически:

- UUID/locale literals в `seed.sql` явно типизированы для PostgreSQL UNION;
- email/password provider включён для входа заранее созданных пользователей,
  при этом глобальная публичная регистрация остаётся выключенной;
- общий streaming loading boundary перенесён на каталог, чтобы неизвестные
  product/category URL возвращали настоящий HTTP 404, а не streamed 200;
- proxy применяет Auth только к route segment `/admin`, safe redirect закрывает
  `/admin/login/` и дочерние варианты.

## Local-only harness

Harness останавливается до тестов, если:

- отсутствует аргумент `--local-only`;
- любой обнаруженный Supabase URL не использует `localhost`/`127.0.0.1` и
  ожидаемый порт;
- существует `supabase/.temp/project-ref` связанного remote-проекта;
- `supabase/config.toml` не соответствует локальному project ID и портам;
- локальный stack не запущен или его status неполон;
- свежий production build под локальным environment завершается ошибкой.

Ключи, JWT, cookies и случайные пароли берутся только из локального runtime,
передаются дочернему процессу через environment и не записываются в Git.
Cleanup выполняется только после повторной проверки local URL.

## Проверенное поведение

- migration + seed на чистой базе и повторяемые clean reset;
- database lint без ошибок;
- полный SQL schema/RLS/integrity contract;
- anon public reads, draft/archive hiding и write denial;
- authenticated non-admin, запрет self-role/profile mutation и игнорирование
  `user_metadata.role`;
- active admin draft read/update;
- inactive admin, немедленное закрытие admin RLS и уже выданной SSR-сессии;
- публичная регистрация запрещена;
- login, neutral login errors, logout, refresh token и обновление SSR cookies;
- server-side admin guard, private/no-store responses и safe redirects;
- Storage admin upload/delete, public download, empty unauthorized list/delete,
  MIME/path/size limits, запрет update/upsert;
- реальный Supabase repository: 3 категории, 12 товаров, RU/RO, dynamic
  attributes, similar products и public settings;
- production HTTP: `/`, RU/RO home/catalog/category/product, неизвестные,
  draft и archived URL, а также настоящий HTTP 404.

## Выполненные команды

```bash
npm ci
npm run db:start
npm run db:reset:local
npm run db:lint:local
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build
npm run test:integration:local
git diff --check
```

`db:reset:local` был успешно выполнен несколько раз после исправлений, поэтому
результат не зависит от состояния предыдущего контейнера.

## Оставшиеся границы

- Remote Supabase, hosted Advisors и production Vercel не проверялись и не
  изменялись.
- Public Storage bucket по дизайну отдаёт известный object URL без RLS; он не
  предназначен для секретных draft media.
- Storage whitelist проверяет заявленный MIME type. Проверка magic bytes должна
  быть частью будущего server-side admin upload workflow.
- Заявки, Telegram, полноценный admin CRUD и AI относятся к следующим этапам и
  намеренно не начаты.

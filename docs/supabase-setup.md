# Настройка Supabase

Ниже нет автоматических remote-операций. Перед `db push` всегда проверьте project ref и dry run.

## 1. Создание проекта

1. Создайте проект в Supabase Dashboard.
2. В Connect/API keys скопируйте Project URL и **publishable key**.
3. Secret/service-role key нужен server-only endpoint заявок. Никогда не добавляйте его в `NEXT_PUBLIC_*` или клиентский код.
4. Отключите публичную регистрацию в Auth settings. Пользователей создаёт только владелец через Dashboard.

Publishable key передаётся браузеру и безопасен только вместе с grants/RLS. Service-role key является секретом и bypasses RLS.

## 2. Локальная настройка

```bash
npm ci
cp .env.example .env.local
npm run db:start
npm run db:reset:local
```

Нужен Docker-compatible runtime. Скопируйте локальные `API URL` и publishable/anon key из CLI output:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=local-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=local-secret-or-service-role-key
LEAD_IP_HASH_SECRET=replace-with-random-secret-at-least-32-characters
CATALOG_DATA_SOURCE=supabase
```

`SUPABASE_SERVICE_ROLE_KEY` не нужен storefront/Auth, но обязателен для `/api/leads`. `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` можно не задавать локально: заявка сохранится, а delivery будет явно отмечена как `permanent_failure/telegram_config_missing`.

## 3. Migration и seed

`npm run db:reset:local` применяет все `supabase/migrations/*.sql`, затем `supabase/seed.sql`. Команда имеет явный `--local` и не может сбросить linked project.

Проверки:

```bash
npm run db:lint:local
npx supabase migration list --local
npm run db:types:local > /tmp/tehnosklad-database.types.ts
```

Сравните с ручными query-shape types в `src/features/catalog/supabase/rows.ts`. Они намеренно не объявлены автоматически синхронизированными. После успешной локальной генерации замените/адаптируйте типы отдельным reviewed change, затем повторите typecheck/tests.

## 4. Storage

Migration автоматически создаёт public bucket `product-images`:

- max 5 MiB;
- JPEG/PNG/WebP/AVIF;
- admin insert/select/delete;
- immutable `<product_uuid>/<random_uuid>.<ext>`;
- оба UUID versioned, extension входит в whitelist, дополнительные path segments запрещены;
- update/upsert намеренно запрещён.

После migration откройте Storage в Dashboard и проверьте bucket settings. Не создавайте второй bucket вручную с отличающимися ограничениями.

## 5. Remote migration

Только владелец, после backup и проверки target:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --linked --dry-run
npx supabase migration list --linked
```

Изучите dry run. Для применения migration отдельно выполните:

```bash
npx supabase db push --linked
```

Seed не добавляйте в production автоматически. Если demo catalog нужен в отдельном staging-проекте, примените seed сознательно только к staging после проверки target.

## 6. Первый Auth user/admin

1. Dashboard → Authentication → Users → Add user.
2. Создайте email/password пользователя; не сохраняйте пароль в Git/SQL.
3. Скопируйте UUID пользователя.
4. SQL Editor от доверенной database role:

```sql
begin;

insert into public.profiles (id, display_name, is_active)
values ('USER_UUID', 'Administrator', true)
on conflict (id) do update
set display_name = excluded.display_name,
    is_active = true;

insert into public.user_roles (user_id, role)
values ('USER_UUID', 'admin')
on conflict (user_id) do update
set role = excluded.role;

commit;
```

Обычный publishable/authenticated client не может выполнить bootstrap. Не используйте `user_metadata` для role.

## 7. Проверка входа

1. Запустите `npm run dev`.
2. Откройте `/admin/login`.
3. Admin должен попасть на `/admin`, увидеть email/role и выйти кнопкой.
4. Auth user без `user_roles.admin` должен получить нейтральную ошибку и не попасть в dashboard.
5. После деактивации `profiles.is_active=false` существующий пользователь должен потерять доступ при следующей server check.

После входа доступны реальные разделы `/admin/categories`, `/admin/attribute-groups`, `/admin/attributes`, `/admin/products`, `/admin/leads`, `/admin/settings` и `/admin/media/orphans`. Начинайте с draft-сущностей: создайте RU/RO, затем bindings/required values и только после этого включайте публикацию. Ошибка publication constraint показывается как безопасное сообщение, а транзакция сохраняет прежнее корректное состояние.

Для изображения выберите JPEG/PNG/WebP/AVIF до 5 MiB и сразу заполните оба alt-текста. Не загружайте объект вручную под выбранным именем: имя генерирует Server Action, overwrite выключен. После аварии upload/delete откройте `/admin/media/orphans` и выполните точечную сверку. Экран ограничен 1000 product folders и 1000 objects в одной папке за один scan; при превышении используйте отдельный reviewed maintenance script с pagination.

## 8. Проверка RLS

Запустите `supabase/verification/rls.sql` и `supabase/verification/integrity.sql` в локальном SQL Editor, затем сценарии из [rls-access-matrix.md](rls-access-matrix.md). В hosted Dashboard дополнительно запустите Security/Performance Advisors.

## 9. Vercel

Для Preview/Production задайте отдельно:

```dotenv
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
LEAD_IP_HASH_SECRET=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
CATALOG_DATA_SOURCE=supabase
```

Используйте отдельный случайный `LEAD_IP_HASH_SECRET` длиной не менее 32 символов. Telegram variables задаются только парой; chat ID может быть отрицательным для группы. Проверьте Supabase Auth Site URL/allowed redirects, `/ru`, `/ro`, catalog, product, реальную форму заявки и `/admin/login`. Docker/local filesystem в production не требуются.

## 10. Статус проверки

Полный local прогон выполняет clean migration/seed, DB lint, SQL assertions,
anon/non-admin/admin/inactive-admin RLS, Storage, реальный email/password
login/logout/cookie refresh, административный CRUD, revalidation и production server.
Запуск: `npm run test:integration:local`; harness перед HTTP-проверками сам
проверяет Docker/local target, выполняет SQL verification и делает свежий
production build с локальными Supabase URL и publishable key.
Подробный отчёт:
[stage-3-runtime-validation.md](stage-3-runtime-validation.md).

Remote-проект, hosted Advisors и автоматически generated Database types не
проверялись. Remote Supabase не подключался и не изменялся.

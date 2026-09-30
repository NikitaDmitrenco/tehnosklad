# Локальная тестовая среда

Руководство по запуску локальной среды, технически близкой к production (Next.js + Supabase в Docker).

## Предпосылки

- Node.js 22.x (работает и с 24.x через `--ignore-engines`)
- npm 10+
- Docker Desktop запущен
- Git

## Запуск среды

### 1. Первый запуск (или после `docker system prune`)

```bash
npm ci
cp .env.example .env.local
# Заполнить .env.local см. ниже
npm run db:start          # Запуск Supabase в Docker (первый раз тянет образы)
npm run db:reset:local    # Применяет миграции + seed
npm run db:lint:local     # Проверка схемы
node scripts/local-test/ensure-admin.mjs  # Создание тестового админа
npm run dev               # Запуск Next.js dev server на порту 3000
```

### 2. Повседневный запуск

```bash
npm run db:start          # Поднимает Docker-контейнеры (авто-восстановление при рестарте)
npm run dev               # Запуск dev server
```

Dev server на порту 3000 автоматически подхватывает `.env.local` и работает с Supabase.

### 3. Остановка

```bash
npm run db:stop           # Останавливает Docker-контейнеры Supabase
# Или просто закройте терминал с npm run dev (Ctrl+C)
```

### 4. Сброс БД до чистого состояния

```bash
npm run db:reset:local    # Сброс: миграции + seed
node scripts/local-test/ensure-admin.mjs  # Пересоздание тестового админа
```

## Переменные окружения

`.env.local` заполняется из `supabase status -o env` после `db:start`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
CATALOG_DATA_SOURCE=supabase
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
LEAD_IP_HASH_SECRET=<64-символьный hex>
AI_RATE_LIMIT_SECRET=<64-символьный hex, другой>
AI_PROVIDER=fallback
E2E_ADMIN_EMAIL=admin.e2e@tehnosklad.local
E2E_ADMIN_PASSWORD=Tehnosklad-Test-2026!Pass
```

Остальные переменные (`TELEGRAM_*`, `LEGAL_*`) опциональны в dev и не блокируют работу.

## Тестовый администратор

| Поле | Значение |
|------|----------|
| Email | `admin.e2e@tehnosklad.local` |
| Пароль | `Tehnosklad-Test-2026!Pass` |
| Роль | `admin` в `user_roles` |
| Профиль | `is_active = true` в `profiles` |

Создание/обновление: `node scripts/local-test/ensure-admin.mjs`

Вход: открыть `http://localhost:3000/admin/login`, ввести email и пароль.

## Запуск тестов

### Playwright (E2E)

```bash
# Перед запуском: dev server должен работать на порту 3000
npm run test:e2e:smoke    # Smoke-тесты admin (3 теста)
npm run test:e2e:admin    # Все admin-тесты (4 теста)
npx playwright test --project=chromium  # Публичные тесты
```

Playwright переиспользует запущенный dev server (`reuseExistingServer: true`).

`playwright/.auth/admin.json` — storageState для admin-проекта (создаётся автоматически setup-проектом, gitignored).

### Unit-тесты

```bash
npm test                  # Vitest (194 теста)
```

### Интеграционные тесты

```bash
# Остановить dev server (порт 3000) перед запуском
npm run test:integration:local  # Полный цикл: SQL-проверки + production build (порт 3100) + тесты
```

⚠️ Интеграционные тесты делают production build и стартуют сервер на порту 3100. Убедитесь, что порт 3100 свободен.

## Порты

| Сервис | Порт |
|--------|------|
| Next.js dev server | 3000 |
| Next.js production (integration) | 3100 |
| Supabase API (PostgREST, Auth, etc.) | 54321 |
| PostgreSQL | 54322 |
| Shadow DB (migrations) | 54320 |
| Supabase Studio | 54323 |
| Mailpit (SMTP) | 54324 |

## Типовые проблемы

### Port 3000 занят

```powershell
Get-NetTCPConnection -LocalPort 3000 | Stop-Process -Id { $_.OwningProcess }
```

### Docker не запущен

Запустите Docker Desktop и дождитесь статуса "Docker Desktop is running".

### CSP блокирует Supabase

В текущей версии admin-логин использует Server Action (same-origin POST), поэтому CSP не блокирует. Если появятся клиентские вызовы к `http://127.0.0.1:54321`, CSP в `next.config.ts` потребует изменения.

### E2E-тесты не видят dev server

Playwright переиспует существующий сервер на порту 3000. Если dev server не запущен, Playwright запустит его автоматически. Убедитесь, что `.env.local` имеет `CATALOG_DATA_SOURCE=supabase`.

### db:lint:local выдает ошибки

Выполните `npm run db:reset:local` для чистого состояния.

### Интеграционные тесты падают с ошибкой counts

Некоторые тесты в `stage-3-runtime.test.ts` содержат hardcoded-ожидания по числу seed-данных (3 категории, 12 товаров). Seed data вырос до 15/105. Это **известная проблема в тестах**, а не в среде.

### Stale slug routes после E2E

E2E-тесты могут оставлять orphaned slug routes (FK RESTRICT не даёт удалить category). Решение: `npm run db:reset:local`.

## Известные отличия от production

| Аспект | Production (Vercel) | Локальная среда |
|--------|---------------------|-----------------|
| Node.js | 22.x (Vercel) | 24.x (работает) |
| Runtime | Vercel Edge + Node | Node.js + Turbopack |
| CSP | `connect-src 'self' https://*.supabase.co` | Аналогично; localhost не блокируется (Server Actions) |
| HTTPS | Да | Нет (HTTP localhost) |
| Telegram | Работает | Пустые переменные → `permanent_failure` |
| AI fallback | Работает через fallback | Работает через fallback |
| Cookies | Secure + SameSite=Lax | Non-secure (localhost) |
| Rate limiting | `x-vercel-forwarded-for` | Fallback на process-local |
| Supabase Analytics | Включен | `supabase_vector` рестартится (Docker TCP, не критично) |
| Supabase ключи | JWT-формат | `sb_publishable_*` / `sb_secret_*` (Supabase CLI v2.111+) |

## Структура файлов

```
.env.local                  # Конфигурация (gitignored)
scripts/local-test/
  ensure-admin.mjs          # Идемпотентное создание тестового админа
playwright/.auth/
  admin.json                # StorageState для Playwright admin (gitignored)
```

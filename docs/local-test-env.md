# Локальная тестовая среда

Руководство по запуску локальной среды, технически близкой к production (Next.js + Supabase в Docker).

## Предпосылки

- Node.js 22.x (рекомендуется через fnm; работает и с 24.x через `--ignore-engines`)
- npm 10+
- Docker Desktop запущен
- Git

### Переключение версии Node

Проект использует fnm (Fast Node Manager) для управления версией Node. Файл `.node-version` в корне проекта задаёт версию 22.

```bash
# Установка fnm (одноразово, user-level)
winget install Schniz.fnm

# В каждом новом терминале (или добавьте в $PROFILE):
fnm env --shell powershell | Invoke-Expression

# Переключение на версию проекта:
fnm use          # читает .node-version → ставит Node 22.x

# Проверка:
node -v          # должен показать v22.x
```

Если fnm не установлен, проект работает и с Node 24.x (`npm ci --ignore-engines`), но официальная версия — 22.x.

## Запуск среды

### 1. Первый запуск (или после `docker system prune`)

```bash
npm ci
cp .env.example .env.local
# Заполнить .env.local (см. раздел «Переменные окружения»)
npm run db:start              # Запуск Supabase в Docker (первый раз тянет образы)
npm run db:reset:local        # Применяет миграции + seed
npm run db:lint:local         # Проверка схемы
node scripts/local-test/ensure-admin.mjs  # Создание тестового админа
npm run dev                   # Запуск Next.js dev server на порту 3000
```

### 2. Повседневный запуск

```bash
npm run db:start              # Поднимает Docker-контейнеры (авто-восстановление при рестарте)
npm run dev                   # Запуск dev server (Turbopack)
```

Dev server на порту 3000 автоматически подхватывает `.env.local` и работает с Supabase.

### 3. Production-like запуск (webpack, NODE_ENV=production)

Для тестирования в условиях, максимально близких к production:

```bash
# Остановить dev server, если работает на порту 3000
npm run build                 # Production build (с флагом --webpack)
npm start                     # Next.js production server на порту 3000
```

Этот режим использует webpack (не Turbopack), NODE_ENV=production, и stricter cookie/env behavior.
Рекомендуется для финальной проверки перед деплоем.

### 4. Остановка

```bash
npm run db:stop               # Останавливает Docker-контейнеры Supabase
# Или просто закройте терминал с npm run dev (Ctrl+C)
```

### 5. Сброс БД до чистого состояния

```bash
npm run db:reset:local        # Сброс: миграции + seed
node scripts/local-test/ensure-admin.mjs  # Пересоздание тестового админа
```

**Важно:** между прогонами E2E-тестов рекомендуется выполнять `npm run db:reset:local`, потому что функция очистки `adminDb.cleanUpByRunId` не удаляет orphaned slug routes (FK RESTRICT блокирует удаление категорий). Без сброса stale routes накапливаются и нарушают integrity-проверки.

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
E2E_ADMIN_PASSWORD=<задайте в .env.local, не менее 8 символов>
```

Остальные переменные (`TELEGRAM_*`, `LEGAL_*`) опциональны в dev и не блокируют работу.

## Тестовый администратор

| Поле | Значение |
|------|----------|
| Email | `admin.e2e@tehnosklad.local` |
| Пароль | Задан в `.env.local` (`E2E_ADMIN_PASSWORD`) |
| Роль | `admin` в `user_roles` |
| Профиль | `is_active = true` в `profiles` |

Создание/обновление: `node scripts/local-test/ensure-admin.mjs`

Вход: открыть `http://localhost:3000/admin/login`, ввести email и пароль из `.env.local`.

## Запуск тестов

### Playwright (E2E)

```bash
# Перед запуском: dev или production server должен работать на порту 3000
npm run test:e2e:smoke    # Smoke-тесты admin (3 теста)
npm run test:e2e:admin    # Все admin-тесты (4 теста)
npx playwright test --project=chromium  # Публичные тесты
```

Playwright переиспользует запущенный сервер на порту 3000 (`reuseExistingServer: true`).

`playwright/.auth/admin.json` — storageState для admin-проекта (создаётся автоматически setup-проектом, gitignored).

### Unit-тесты

```bash
npm test                  # Vitest (194 теста)
```

### Интеграционные тесты

```bash
# Остановить dev/production server (порт 3000) перед запуском
npm run test:integration:local  # Полный цикл: SQL-проверки + production build (порт 3100) + тесты
```

⚠️ Интеграционные тесты делают production build и стартуют сервер на порту 3100. Убедитесь, что порт 3100 свободен.

## Порты

| Сервис | Порт |
|--------|------|
| Next.js dev / production server | 3000 |
| Next.js production (integration) | 3100 |
| Supabase API (PostgREST, Auth, etc.) | 54321 |
| PostgreSQL | 54322 |
| Shadow DB (migrations) | 54320 |
| Supabase Studio | 54323 |
| Mailpit (SMTP) | 54324 |

## Типовые проблемы

### Port 3000 занят

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | Stop-Process -Id { $_.OwningProcess }
```

### Docker не запущен

Запустите Docker Desktop и дождитесь статуса "Docker Desktop is running".

### CSP блокирует Supabase

В текущей версии admin-логин использует Server Action (same-origin POST), поэтому CSP не блокирует. Если появятся клиентские вызовы к `http://127.0.0.1:54321`, CSP в `next.config.ts` потребует изменения.

### E2E-тесты не видят сервер

Playwright переиспользует существующий сервер на порту 3000. Если dev server не запущен, Playwright запустит его автоматически. Убедитесь, что `.env.local` имеет `CATALOG_DATA_SOURCE=supabase`.

### db:lint:local выдает ошибки

Выполните `npm run db:reset:local` для чистого состояния.

### Интеграционные тесты падают с ошибкой counts

Некоторые тесты в `stage-3-runtime.test.ts` содержат hardcoded-ожидания по числу seed-данных (3 категории, 12 товаров). Seed data вырос до 15/105. Это **известная проблема в тестах**, а не в среде.

### Stale slug routes после E2E

E2E-тесты могут оставлять orphaned slug routes (FK RESTRICT не даёт удалить category). Решение: `npm run db:reset:local` перед следующим прогоном.

### Node 22 не найден

Если fnm не установлен или `fnm use` не работает:
1. Установите fnm: `winget install Schniz.fnm`
2. Добавьте в PowerShell profile: `fnm env --shell powershell | Invoke-Expression`
3. Запустите новый терминал
4. В каталоге проекта: `fnm use` (подхватит `.node-version`)

## Известные отличия от production

| Аспект | Production (Vercel) | Локальная dev среда | Локальная production-like |
|--------|---------------------|---------------------|---------------------------|
| Node.js | 22.x (Vercel) | 22.x (fnm) | 22.x (fnm) |
| Bundler | webpack | Turbopack | webpack |
| NODE_ENV | production | development | production |
| CSP | `connect-src 'self' https://*.supabase.co` | Аналогично | Аналогично |
| HTTPS | Да | Нет (HTTP localhost) | Нет (HTTP localhost) |
| Cookies | Secure + SameSite=Lax | Non-secure (localhost) | Non-secure (localhost) |
| Rate limiting | `x-vercel-forwarded-for` | Fallback на process-local | Fallback на process-local |
| Supabase Analytics | Включён (hosted) | `supabase_vector` рестартится (Docker TCP, не критично) | То же |
| Telegram | Настраивается отдельно | Пустые переменные → `permanent_failure` | Пустые переменные → `permanent_failure` |
| AI fallback | Работает | Работает | Работает |
| Supabase ключи | Зависит от CLI/hosting | `sb_publishable_*` / `sb_secret_*` (Supabase CLI 2.111+) | То же |

**Замечание по тестам:**
- 4 падения публичных Playwright-тестов (product link navigation) наблюдаются **только** в dev-режиме (Turbopack). В production-like режиме (webpack) все 4 проходят. Артефакты dev-сервера, не баги.
- Тест `locale-switching.spec.ts:19` падает в production-like режиме: `localeCookieOptions()` ставит `secure: true` при `NODE_ENV=production`, а сервер работает по HTTP. Playwright Chromium не сохраняет Secure-куку поверх HTTP localhost. В dev (`secure: false`) тест проходит. Код приложения корректен для Vercel (HTTPS). Тест написан под dev-окружение.

**Рекомендуемый сервер для написания admin-тестов:** production-like (`npm run build && npm start`). Это webpack + NODE_ENV=production — ближе всего к Vercel. Playwright переиспользует всё, что слушает порт 3000 (`reuseExistingServer: true`) — перед запуском тестов убедитесь, что запущен именно нужный сервер.

## Структура файлов

```
.node-version                # Версия Node для fnm (22)
.env.local                   # Конфигурация (gitignored)
scripts/local-test/
  ensure-admin.mjs           # Идемпотентное создание тестового админа
playwright/.auth/
  admin.json                 # StorageState для Playwright admin (gitignored)
```

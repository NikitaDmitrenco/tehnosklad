# E2E Testing Guide (Playwright)

Руководство по запуску и разработке сквозных (End-to-End) тестов административной панели **Tehnosklad** на базе **Playwright**.

---

## 1. Prerequisites (Предварительные требования)

- **Node.js**: версия 22.x
- **Docker Desktop**: запущен (для локального стека Supabase)
- **Supabase CLI**: локальный стек (`project_id = "sklad"`)

---

## 2. Environment (Переменные окружения)

Конфигурация для локального тестирования находится в `.env.local` (файл добавлен в `.gitignore`):

```bash
# Локальный URL приложения
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Локальный Supabase стек (API: 54321, DB: 54322)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Режим каталога для тестирования админки
CATALOG_DATA_SOURCE=supabase

# Учетные данные тестового администратора (настраиваются через переменные)
E2E_ADMIN_EMAIL=admin.e2e@test.local
E2E_ADMIN_PASSWORD=E2E-Admin-Local-2026!Pass
```

> **Безопасность**: Запрещено хардкодить пароли и service-role ключи в коде тестов, git-истории или markdown-документации. В коде тестов используются переменные `E2E_ADMIN_EMAIL` и `E2E_ADMIN_PASSWORD` с безопасными локальными фоллбэками.

---

## 3. Start local Supabase (Запуск локальной базы)

```bash
# 1. Запуск контейнеров локального Supabase
npm run db:start

# 2. Накат всех миграций и сида базы данных
npm run db:reset:local
```

Локальный стек доступен по адресам:

- **API Gateway (Kong)**: `http://127.0.0.1:54321`
- **PostgreSQL Database**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Supabase Studio**: `http://127.0.0.1:54323`
- **Mailpit**: `http://127.0.0.1:54324`

---

## 4. Start application (Запуск приложения)

```bash
npm run dev
```

Приложение доступно на `http://localhost:3000`. При запуске тестов Playwright автоматически переиспользует уже запущенный сервер благодаря `reuseExistingServer: true`.

---

## 5. Run E2E (Команды запуска тестов)

### Запуск всех админских E2E-тестов:

```bash
npm run test:e2e:admin
```

### Запуск только минимального Smoke-теста:

```bash
npm run test:e2e:smoke
```

### Запуск витринных тестов (Storefront):

```bash
npx playwright test --project=chromium
```

### Запуск с интерактивным UI Playwright:

```bash
npx playwright test --ui
```

---

## 6. Test Authentication & Storage State (Аутентификация)

1. **Глобальный проект `setup` (`e2e/auth.setup.ts`)**:
   - Вызывается автоматически перед выполнением админских тестов (проект `admin` имеет `dependencies: ["setup"]`).
   - Функция `ensureTestAdminUser()` проверяет наличие пользователя в локальной Auth GoTrue. Если пользователь отсутствует, он создается через Supabase Admin API с автоматическим созданием активного профиля (`profiles.is_active = true`) и назначением роли `user_roles.role = 'admin'`.
   - В браузере открывается страница `/admin/login`, заполняются поля email и пароля, форма отправляется.
   - Проверяется успешный редирект на `/admin` и видимость шапки панели с email администратора.
   - Авторизованное состояние (сессионные cookies) сохраняется в файл `playwright/.auth/admin.json`.
2. **Использование Storage State**:
   - Все тесты проекта `admin` автоматически используют сохраненную сессию, исключая необходимость повторного входа в каждом тесте.
   - Файл `playwright/.auth/` добавлен в `.gitignore` и никогда не попадает в репозиторий.

---

## 7. RUN_ID (Изоляция тестовых прогонов)

Каждый тест или тестовый прогон получает уникальный идентификатор `RUN_ID`:

- **Формат**: `E2E-YYYYMMDD-HHMMSS-RAND` (например, `E2E-20260819-181430-a81f`).
- **Использование**:
  - SKU товаров: `TS-E2E-A81F-01`
  - Слаги категорий и товаров: `cat-e2e-20260819-181430-a81f-ru`
  - Названия сущностей: `Тест Категория E2E-20260819-181430-a81f`
- Предотвращает конфликты уникальных ограничений (`unique constraint`, `duplicate key`) между параллельными воркерами и при повторных запусках.

---

## 8. Test Data & Factories (Фабрики данных)

Вспомогательные фабрики расположены в `e2e/helpers/factories/`:

- `buildCategoryData(runId, overrides)` / `createCategoryViaUI(page, data)`
- `buildAttributeGroupData(runId, overrides)`
- `buildAttributeData(runId, type, overrides)`
- `buildProductData(runId, categoryId, overrides)`
- `buildLeadData(runId, overrides)`

Все фабрики принимают текущий `RUN_ID` и генерируют валидные двуязычные структуры данных (RU/RO), соответствующие ограничениям схемы PostgreSQL.

---

## 9. Database Verification & Cleanup (Проверка БД и очистка)

В модуле `e2e/helpers/admin-db.ts` реализованы:

1. **`verifyCategoryExists(slug)` / `verifyProductExists(sku)`**: прямое чтение строк через локальный клиент для подтверждения персистентности данных в базе.
2. **`cleanUpByRunId(runId)`**:
   - Автоматически вызывается в фикстуре `adminPage` после завершения каждого теста (`afterEach`).
   - Удаляет сущности строго по цепочке внешних ключей:
     `leads` → `product_images` → `product_attribute_values` → `product_translations` → `products` → `category_attributes` → `category_translations` → `categories` → `attribute_options` → `attributes` → `attribute_groups`.
   - Удаляются **только** записи, содержащие текущий `RUN_ID`, что исключает повреждение базового сида каталога (15 категорий, 105 товаров).

---

## 10. Troubleshooting (Устранение неполадок)

| Проблема                                                     | Причина                               | Решение                                                                     |
| ------------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------- |
| `connect ECONNREFUSED 127.0.0.1:54321`                       | Локальный Supabase остановлен         | Запустите Docker Desktop и выполните `npm run db:start`                     |
| `HTTP 500 on /ru or /admin`                                  | База данных не инициализирована       | Выполните `npm run db:reset:local`                                          |
| `Process from config.webServer was not able to start`        | Конфликт портов                       | Убедитесь, что `reuseExistingServer: true` в `playwright.config.ts`         |
| `strict mode violation: locator(...) resolved to N elements` | Неоднозначный селектор                | Используйте более точные локаторы: `getByRole('banner')`, `locator('main')` |
| `duplicate key value violates unique constraint`             | Повторное использование старого слага | Используйте хелпер `formatRunSlug(prefix, runId, locale)`                   |

---

_Документация поддерживается в актуальном состоянии вместе с кодовой базой E2E-инфраструктуры._

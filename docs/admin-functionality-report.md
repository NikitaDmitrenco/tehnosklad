# Отчёт об функциональности административной панели Tehnosklad

Назначение: источник фактов для написания Playwright-тестов `/admin`.
Формат: purpose / access / UI map / intended / observed success / observed failure / data model / side effects / async / test data / existing coverage / proposed scenarios / discrepancies / not-verifiable.

**Evidence tags:** `[CODE path:line]` · `[OBSERVED]` (сервер: dev или prod-like) · `[DOC file]` · `[DB]` · `[INFERRED]`

**Среда наблюдения:** production-like (`npm run build` → `next start`, порт 3000), Supabase local `127.0.0.1:54321`, `CATALOG_DATA_SOURCE=supabase`, `AI_PROVIDER=fallback`, Telegram-переменные пусты → outbox `permanent_failure` / `telegram_config_missing`.

**Учётные данные:** `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` из `.env.local` (см. `docs/local-test-env.md`). Значения секретов в отчёт не вносятся.

---

## Executive summary

Админка — серверный App Router backoffice на `/admin`, интерфейс русский `[DOC ADMIN_GUIDE.md §22]`, `[CODE src/app/(backoffice)/admin/layout.tsx]`. Доступ: proxy (`getClaims()`) → `/admin/login?next=…`; layout/страницы/actions — `requireAdmin()` = `getUser()` + `profiles.is_active` + `user_roles.role='admin'` `[CODE src/features/admin/auth/guard.ts:15-45]`. Мутации: server actions → `admin_*` RPC under RLS; service-role client только для storage/anonymous paths.

Мутации redirect `?saved=1` или `?error=<code>`; тексты — `AdminNotice` + `adminErrorMessage()` `[CODE src/components/admin/admin-ui.tsx:33-54]`, `[CODE src/features/admin/errors.ts:107-119]`. Успех: `Изменения сохранены.` (с точкой). Ошибки — безопасные RU-строки.

Каталог: категории (RU/RO, slug, image `category-images`, архив), attribute groups/attributes (types, options, bindings), products (draft/publish/archive, attributes, images `product-images`, checklist, preview, витрина). Заявки: list/filter, detail, status history, Telegram outbox + requeue. Settings: 7 public keys, RU/RO pair. Media orphans: scan product-images vs metadata. Assistant knowledge: bilingual articles. Assistant logs: anonymized telemetry (локально записи есть).

Существующее e2e admin: SMOKE-01 (dashboard/nav), SMOKE-02 (create category + DB), admin-navigation-styles (hover CSS). Остальные admin-маршруты не покрыты.

Ключевые наблюдённые баги: (1) карточка заявки не показывает существующий Telegram outbox (`Delivery отсутствует` при rows в DB); (2) sanitizer не знает `Published child category requires a published parent` → generic `Операция не выполнена…`; (3) UI SEO maxLength 70/160 vs server 180/320; (4) e2e cleanup не удаляет slug_routes → orphan категории/UUID в select.

---

## Route inventory

| URL                                     | Page file                                   | Purpose                           | Actions / RPCs                                                                                                                                          | Tables                                                                           |
| --------------------------------------- | ------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `/admin/login`                          | `…/admin/login/page.tsx`                    | Login                             | `signInAdmin` → Auth `signInWithPassword`                                                                                                               | auth.users, profiles, user_roles                                                 |
| `/admin`                                | `…/(protected)/page.tsx`                    | Dashboard                         | `getAdminDashboard` (read)                                                                                                                              | products, categories, leads, lead_telegram_deliveries, assistant_knowledge       |
| `/admin/categories`                     | `…/categories/page.tsx`                     | Category list                     | `listAdminCategories`                                                                                                                                   | categories, category_translations, products                                      |
| `/admin/categories/new`                 | `…/categories/new/page.tsx`                 | Create category                   | `saveCategoryAction` → `admin_save_category`                                                                                                            | categories, category_translations, slug_routes                                   |
| `/admin/categories/[id]`                | `…/categories/[id]/page.tsx`                | Edit + image + archive            | `saveCategoryAction`, `uploadCategoryImageAction` → `admin_set_category_image`, `setCategoryArchivedAction` → `admin_set_category_archived`             | categories, translations, category-images                                        |
| `/admin/attribute-groups`               | `…/attribute-groups/page.tsx`               | Group list                        | `listAdminAttributeGroups`                                                                                                                              | attribute_groups, translations, attributes                                       |
| `/admin/attribute-groups/new`           | `…/attribute-groups/new/page.tsx`           | Create group                      | `saveAttributeGroupAction` → `admin_save_attribute_group`                                                                                               | attribute_groups, attribute_group_translations                                   |
| `/admin/attribute-groups/[id]`          | `…/attribute-groups/[id]/page.tsx`          | Edit/delete group                 | `saveAttributeGroupAction`, `deleteAttributeGroupAction` → `admin_delete_attribute_group`                                                               | attribute_groups, attributes                                                     |
| `/admin/attributes`                     | `…/attributes/page.tsx`                     | Attribute list                    | `listAdminAttributes`                                                                                                                                   | attributes, options, category_attributes                                         |
| `/admin/attributes/new`                 | `…/attributes/new/page.tsx`                 | Create attribute                  | `saveAttributeAction` → `admin_save_attribute`                                                                                                          | attributes, attribute_translations                                               |
| `/admin/attributes/[id]`                | `…/attributes/[id]/page.tsx`                | Edit, options, bindings, delete   | `saveAttributeAction`, `saveAttributeOptionAction`, `deleteAttributeOptionAction`, `setCategoryAttributeAction`, `deleteAttributeAction` + RPCs         | attributes, attribute_options, category_attributes, product_attribute_values     |
| `/admin/products`                       | `…/products/page.tsx`                       | Product list + filters            | `listAdminProducts`, `listAdminCategories`                                                                                                              | products, product_translations                                                   |
| `/admin/products/new`                   | `…/products/new/page.tsx`                   | Create product draft              | `saveProductAction` → `admin_save_product`                                                                                                              | products, product_translations                                                   |
| `/admin/products/[id]`                  | `…/products/[id]/page.tsx`                  | Editor + attrs + images + archive | `saveProductAction`, `saveProductAttributesAction`, image upload/update/delete, `setProductArchivedAction`                                              | products, translations, product_attribute_values, product_images, product-images |
| `/admin/products/[id]/preview/[locale]` | `…/products/[id]/preview/[locale]/page.tsx` | Admin preview                     | read                                                                                                                                                    | products + translations                                                          |
| `/admin/leads`                          | `…/leads/page.tsx`                          | Leads + filters + CSV link        | `listAdminLeads`, `listAdminProducts`                                                                                                                   | leads, history, deliveries                                                       |
| `/admin/leads/[id]`                     | `…/leads/[id]/page.tsx`                     | Detail, status, requeue           | `setLeadStatusAction` → `admin_set_lead_status`, `retryLeadTelegramDeliveryAction` → `admin_requeue_lead_telegram_delivery` + `processTelegramDelivery` | leads, history, deliveries, attempts                                             |
| `/admin/leads/export`                   | `…/leads/export/route.ts`                   | CSV GET                           | `listAdminLeads` limit 5000                                                                                                                             | leads (read)                                                                     |
| `/admin/assistant-knowledge`            | `…/assistant-knowledge/page.tsx`            | Article list                      | `listAdminAssistantKnowledge`                                                                                                                           | assistant_knowledge                                                              |
| `/admin/assistant-knowledge/new`        | `…/assistant-knowledge/new/page.tsx`        | Create article                    | `saveAssistantKnowledgeAction` → `admin_save_assistant_knowledge`                                                                                       | assistant_knowledge                                                              |
| `/admin/assistant-knowledge/[id]`       | `…/assistant-knowledge/[id]/page.tsx`       | Edit/delete article               | `saveAssistantKnowledgeAction`, `deleteAssistantKnowledgeAction`                                                                                        | assistant_knowledge                                                              |
| `/admin/assistant-logs`                 | `…/assistant-logs/page.tsx`                 | Telemetry report                  | `getAdminAssistantLogReport`                                                                                                                            | assistant_logs                                                                   |
| `/admin/settings`                       | `…/settings/page.tsx`                       | Public settings                   | `saveSiteSettingAction` → `admin_set_public_site_setting_pair`                                                                                          | site_settings                                                                    |
| `/admin/media/orphans`                  | `…/media/orphans/page.tsx`                  | Storage reconcile                 | `scanAdminProductOrphans`, `reconcileImageEntryAction`                                                                                                  | product_images, product-images storage                                           |

### Auth / role model

| Layer            | Check                                                                                                          | Anonymous                      | Non-admin auth.          | Admin                |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------ | -------------------- |
| Proxy `/admin*`  | `getClaims()` only `[CODE src/lib/supabase/proxy.ts:60-72]`                                                    | redirect `/admin/login?next=…` | claims ok → layout guard | pass                 |
| Protected layout | `requireAdmin()` `[CODE …/(protected)/layout.tsx:15]`                                                          | redirect login                 | redirect login           | header email · admin |
| Page             | `requireAdmin()`                                                                                               | redirect login                 | redirect login           | load                 |
| Server action    | `requireAdmin()` first `[CODE actions.ts]`                                                                     | blocked                        | blocked                  | RPC under RLS        |
| RLS / RPC        | `private.is_admin()` / admin policies                                                                          | no                             | no write                 | full admin write     |
| CSV export       | `requireAdmin()` `[CODE leads/export/route.ts:13]`                                                             | redirect to login HTML         | blocked                  | CSV                  |
| Login auth       | same neutral error for bad password / missing role `[CODE auth/actions.ts:34-37]`, `[DOC ADMIN_GUIDE.md §2.3]` | —                              | observed same message    | —                    |

### Existing e2e coverage

| Route / area            | Spec                               | Covered                                     | Gap                                              |
| ----------------------- | ---------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| `/admin`                | `e2e/admin-smoke.spec.ts` SMOKE-01 | banner, nav labels, metric card texts       | values, deep links, recent leads                 |
| `/admin/categories/new` | SMOKE-02                           | draft create, DB row, `Изменения сохранены` | validation, publish, archive, image, slugs       |
| `/admin/login`          | `e2e/auth.setup.ts`                | UI login + storageState                     | wrong password, non-admin, expired session, next |
| Nav CSS                 | `admin-navigation-styles.spec.ts`  | hover colors                                | mobile drawer, active                            |
| Other admin routes      | —                                  | —                                           | all failure paths, mutations, permissions        |

---

## Shared UI / error conventions

- Success notice: `[role=status]` `Изменения сохранены.` `[CODE admin-ui.tsx:47-51]`
- Error notice: `[role=alert]` from `adminErrorMessage(code)` `[CODE admin-ui.tsx:40-45]`
- Mutation redirect: `?saved=1` / `?error=<code>` `[CODE actions.ts:45-50]`
- Submit pending: `Сохранение…` / `Загрузка…` (upload) / `Выполнение…` (confirm buttons) `[CODE submit-button.tsx]`, `[CODE confirm-submit-button.tsx]`
- Confirm dialogs: `window.confirm(message)` — exact message per form
- Nav labels (exact): Обзор, Категории, Группы характеристик, Характеристики, Товары, Заявки, База знаний помощника, Статистика помощника, Публичные настройки, Проверка файлов `[CODE admin-navigation.tsx:7-18]`
- Header: `Tehnosklad Admin`, `{email} · admin`, button `Выйти`
- Skip link: `К содержимому` → `#admin-main`
- Main landmark: `<main id="admin-main" class="admin-content">`
- Loading skeleton: `[role=status]` aria-label `Загрузка` `[CODE …/(protected)/loading.tsx]`
- Generic error screen: `Не удалось загрузить раздел` + button `Повторить` `[CODE …/(protected)/error.tsx]`
- Not found: `Запись не найдена` + `Возможно, она была архивирована или удалена.` + `Вернуться к обзору` `[CODE …/(protected)/not-found.tsx]`
- Almost no `data-testid` in admin UI; prefer role/label/name= / exact text

### Error message catalog (exact RU, from `errors.ts` + observed)

| code / needle                                     | UI message                                                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `admin_required`                                  | `Требуется активная роль администратора.`                                                                   |
| `category_in_use`                                 | `Категория используется товарами или подкатегориями.`                                                       |
| `category_parent_cycle`                           | `Категория не может быть собственным потомком.`                                                             |
| `attribute_group_in_use`                          | `Группа содержит характеристики.`                                                                           |
| `attribute_in_use`                                | `Характеристика уже используется.`                                                                          |
| `attribute_option_in_use`                         | `Вариант уже используется в товарах.`                                                                       |
| `category_attribute_in_use`                       | `Характеристика заполнена у товаров этой категории.`                                                        |
| `product_category_attributes_incompatible`        | `Сначала очистите несовместимые характеристики товара.`                                                     |
| `Published category requires`                     | `Для публикации категории нужны полные переводы RU и RO.`                                                   |
| `Published product requires ru and ro`            | `Для публикации товара нужны полные переводы RU и RO.`                                                      |
| `Published product requires a published category` | `Сначала опубликуйте выбранную категорию.`                                                                  |
| `missing a required attribute`                    | `Заполните все обязательные характеристики.`                                                                |
| `images require ru and ro alt`                    | `У каждого изображения должны быть alt-тексты RU и RO.`                                                     |
| `incomplete attribute metadata`                   | `Проверьте переводы и активность характеристик и вариантов.`                                                |
| `Cannot change the type`                          | `Тип используемой характеристики менять нельзя.`                                                            |
| `canonical filters`                               | `Текстовая характеристика не может быть каноническим фильтром.`                                             |
| `duplicate key` / `duplicate`                     | `Такой slug, код или SKU уже используется.` / `Такое значение уже используется.`                            |
| `slug is reserved by another category`            | `Этот адрес (slug) уже занят другой категорией, в том числе переименованной или архивной. Выберите другой.` |
| `slug is reserved by another product`             | `Этот адрес (slug) уже занят другим товаром, в том числе переименованным или архивным. Выберите другой.`    |
| `site_setting_not_allowed`                        | `Эту настройку редактировать нельзя.`                                                                       |
| `assistant_knowledge_incomplete`                  | `Заполните заголовок и текст статьи базы знаний.`                                                           |
| `assistant_knowledge_not_found`                   | `Статья базы знаний не найдена.`                                                                            |
| `in_use` (FK 23503)                               | `Сущность используется и не может быть удалена.`                                                            |
| `validation`                                      | `Проверьте обязательные поля и формат значений.`                                                            |
| `upload_invalid`                                  | `Файл должен быть JPEG, PNG, WebP или AVIF размером до 5 МБ.`                                               |
| `operation_failed` / unknown                      | `Операция не выполнена. Проверьте данные и повторите попытку.` / `Операция не выполнена.`                   |
| login `error=credentials`                         | `Вход не выполнен. Проверьте данные и наличие активной роли администратора.` `[CODE login/page.tsx:81-84]`  |
| env missing                                       | `Supabase Auth не настроен. Добавьте публичный URL и publishable key согласно docs/supabase-setup.md.`      |

**Observed unmapped DB message:** `Published child category requires a published parent` `[CODE supabase/migrations/20260805213001_stage_6_admin_crud.sql:54]` → UI generic `Операция не выполнена. Проверьте данные и повторите попытку.` `[OBSERVED prod-like]`, because sanitizer needle is `Published category requires` only `[CODE errors.ts:26-28]`.

---

## Section: Login / auth session — `/admin/login`

- **Purpose / who uses it:** вход в backoffice; единственный способ в `/admin/*`.
- **Access:** публичная страница; если уже admin и env настроен — `redirect(next)` `[CODE login/page.tsx:31]`. Proxy: нет claims → `/admin/login?next=<path>` `[CODE proxy.ts:62-72]`.
- **UI map:**
  - `h1`: `Вход для администратора`
  - subtitle: `Используйте учётную запись Supabase Auth с активной ролью admin.`
  - form `action=signInAdmin`: hidden `next`; label `Email` (`name=email`, type email, required, maxLength 254); `Пароль` (`name=password`, type password, required, minLength 8, maxLength 256); button `Войти`
  - error alert при `?error=`
  - Locators: `getByRole("heading", { name: "Вход для администратора" })`, `getByLabel("Email")`, `getByLabel("Пароль")`, `getByRole("button", { name: "Войти" })`, `input[type="email"]`, `input[type="password"]`, `button:has-text("Войти")`
- **Intended behavior:** одинаковый нейтральный error для wrong password и missing admin role `[DOC ADMIN_GUIDE.md §2.3]`; password ≥8; email trim/lowercase; non-admin local logout; `next` only same-origin `/admin` paths; нет recovery `[CODE auth/actions.ts:14-38]`, `[CODE auth/redirect.ts]`.
- **Observed - success:** login with `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` → URL `/admin` (или `/admin/...`), header `admin.e2e@… · admin` `[OBSERVED prod-like]`.
- **Observed - failure:**

| trigger                                      | expected                  | actual                                                                    | exact message                                                                | data changed?      | tag                 |
| -------------------------------------------- | ------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------ | ------------------- |
| anonymous `/admin`                           | redirect login            | URL `http://localhost:3000/admin/login?next=%2Fadmin`                     | login page, no error alert                                                   | no                 | `[OBSERVED]`        |
| anonymous `/admin/categories`                | redirect login            | `…/login?next=%2Fadmin%2Fcategories`                                      | —                                                                            | no                 | `[OBSERVED]`        |
| anonymous `/admin/leads/export`              | redirect login            | `…/login?next=%2Fadmin%2Fleads%2Fexport`; fetch 200 `text/html` (not CSV) | —                                                                            | no                 | `[OBSERVED]`        |
| wrong password                               | neutral credentials error | URL `…/login?error=credentials&next=%2Fadmin%2Fproducts`                  | `Вход не выполнен. Проверьте данные и наличие активной роли администратора.` | no                 | `[OBSERVED]`        |
| non-admin (valid Auth user, no `user_roles`) | same neutral              | same URL pattern `?error=credentials&next=…`                              | same message                                                                 | user deleted after | `[OBSERVED]`        |
| after non-admin fail, open `/admin`          | still login               | `…/login?next=%2Fadmin`                                                   | —                                                                            | no                 | `[OBSERVED]`        |
| logout `Выйти`                               | `/admin/login`            | URL `/admin/login`                                                        | —                                                                            | session cleared    | `[OBSERVED]`        |
| password <8 client-side                      | HTML5 minLength           | form stays; no server error                                               | browser validation                                                           | no                 | `[INFERRED]/[CODE]` |

- **Data model:** auth.users, profiles.is_active, user_roles.role; Supabase SSR cookies.
- **Side effects:** failed login: no app audit table; non-admin: `signOut({scope:'local'})` then error redirect `[CODE auth/actions.ts:34-36]`.
- **Async:** server-action redirect; wait `waitForURL(/\/admin(?!\/login)/)` as in `auth.setup.ts:24`.
- **Test data:** `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`; non-admin helper: create Auth user + `profiles.is_active=true`, no `user_roles`, delete after; empty storageState for anonymous.
- **Existing e2e:** `auth.setup.ts` happy path only.
- **Proposed scenarios:**

| ID          | P   | Title                              | Steps                              | Expected                                                            |
| ----------- | --- | ---------------------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| ADM-AUTH-01 | P0  | Admin login succeeds               | goto login, fill env creds, submit | URL `/admin`, banner shows email                                    |
| ADM-AUTH-02 | P0  | Anonymous /admin redirects         | goto `/admin` no cookies           | `/admin/login?next=%2Fadmin`                                        |
| ADM-AUTH-03 | P0  | Wrong password neutral error       | fill bad password                  | `?error=credentials`, message `Вход не выполнен…`                   |
| ADM-AUTH-04 | P0  | Non-admin same error               | create non-admin, login            | same message; no dashboard                                          |
| ADM-AUTH-05 | P0  | Logout returns login               | click `Выйти`                      | `/admin/login`                                                      |
| ADM-AUTH-06 | P1  | next preserved for /admin/products | unauth goto `/admin/products`      | login has `next=%2Fadmin%2Fproducts`; after login lands on products |
| ADM-AUTH-07 | P2  | next external rejected             | login with crafted next (via form) | lands `/admin` not external                                         |

- **Discrepancies:** none for login message (doc matches).
- **Not verifiable locally:** production HTTPS Secure cookie behavior `[DOC docs/local-test-env.md]`.

---

## Section: Dashboard — `/admin`

- **Purpose:** daily overview; quick links to products/leads/knowledge.
- **Access:** `requireAdmin()` in page + layout `[CODE page.tsx:10]`.
- **UI map:**
  - `h1` `Панель управления`; description `Состояние каталога, заявок, Telegram delivery и базы знаний помощника.`
  - `section[aria-label=Статистика]` cards (exact labels): `Всего товаров`, `Опубликовано`, `Нет в наличии`, `Категории`, `Новые заявки`, `Ошибки Telegram`, `Статьи базы знаний`
  - hrefs: `/admin/products`, `/admin/products?publication=published`, `/admin/products`, `/admin/categories`, `/admin/leads?status=new`, `/admin/leads`, `/admin/assistant-knowledge`
  - `h2` `Последние заявки` + link `Все заявки`; empty: `Заявок пока нет.`
  - Locators: `nav` links by name; `main.getByText("Всего товаров")`; card accessible names like `Всего товаров 105` (text+value in accessible name)
- **Intended:** 7 metrics + last 5 leads; cards are links `[DOC ADMIN_GUIDE.md §5]`.
- **Observed - success `[OBSERVED prod-like]`:** after seed+analysis: `Всего товаров 105`, `Опубликовано 105`, `Нет в наличии 0`, `Категории 18`, `Новые заявки 0`, `Ошибки Telegram 0`, `Статьи базы знаний 12`, empty leads `Заявок пока нет.` Later after mutations: products 108, published 107, categories 21, new leads 1, telegram errors 2, recent leads listed with status badges.
- **Observed - failure:** anonymous redirect to login (see AUTH).
- **Data model:** counts from products/categories/leads/outbox/assistant_knowledge `[CODE repository.ts:398-459]`.
- **Side effects:** none (read-only).
- **Async:** server-rendered; revalidate after other mutations.
- **Test data:** seed 15 categories/105 products; dashboard numbers drift after tests — assert structure not absolute counts unless after `db:reset`.
- **Existing e2e:** SMOKE-01 partial.
- **Proposed scenarios:**

| ID          | P   | Title                           | Steps                             | Expected                                   |
| ----------- | --- | ------------------------------- | --------------------------------- | ------------------------------------------ |
| ADM-DASH-01 | P0  | Dashboard renders metrics + nav | login, goto `/admin`              | 7 metric cards, nav 10 links, header email |
| ADM-DASH-02 | P1  | Published card filters products | click `Опубликовано`              | `/admin/products?publication=published`    |
| ADM-DASH-03 | P1  | New leads card filters leads    | create lead, click `Новые заявки` | `/admin/leads?status=new` shows lead       |
| ADM-DASH-04 | P1  | Recent leads empty or list      | fresh/reset or with lead          | empty text or lead links                   |

- **Discrepancies:** `Ошибки Telegram` links to unfiltered `/admin/leads` (not delivery-state filter) `[CODE page.tsx:22]`.
- **Not verifiable:** production-only metric baselines.

---

## Section: Categories list — `/admin/categories`

- **Purpose:** catalog tree overview.
- **Access:** `requireAdmin()`.
- **UI map:**
  - `h1` `Категории`; description `RU/RO, локализованные slug, иерархия и публикация.`
  - action link `Добавить категорию` → `/admin/categories/new`
  - card list `a.admin-list-card`: title = RU name or `Без названия RU`; meta = `{RO name or RO не заполнен} · {presentationKey}`; badges: `Черновик` / `Опубликована` / `Архив` + `{n} товаров`
  - empty: `Категорий нет` / `Создайте первую категорию каталога.`
  - Locator: `getByRole("link", { name: "Добавить категорию" })`; card by heading text
- **Intended:** list with publication status and product counts `[DOC §7.1]`.
- **Observed - success:** seed categories `Холодильники` … `Кондиционеры` with `Опубликована` and `7 товаров`; leftover draft categories without translations appear as `Без названия RU` / `RO не заполнен · generic` and UUID hrefs `[OBSERVED]`.
- **Observed - failure:** anonymous → login redirect.
- **Data model:** categories, category_translations; productCount from non-archived products `[CODE repository.ts:52-88]`.
- **Side effects:** none.
- **Async:** `force-dynamic`; list revalidated after mutations.
- **Test data:** seed categories have fixed UUIDs `10000000-0000-4000-8000-000000000001..` (fridge etc.); drafts may appear from prior runs — prefer unique names via runId.
- **Existing e2e:** none dedicated (list not asserted in SMOKE-02 beyond create).
- **Proposed scenarios:**

| ID         | P   | Title                                     | Expected                                                  |
| ---------- | --- | ----------------------------------------- | --------------------------------------------------------- |
| ADM-CAT-01 | P0  | List shows seed published categories      | `Холодильники` visible, badge `Опубликована`, `7 товаров` |
| ADM-CAT-02 | P1  | Add link opens new form                   | `/admin/categories/new`                                   |
| ADM-CAT-03 | P2  | Archived badge appears after archive test | `Архив` badge                                             |

- **Discrepancies:** e2e cleanup leaves draft categories without RU/RO; parent select shows raw UUIDs `[OBSERVED]`.

---

## Section: Categories create — `/admin/categories/new`

- **Purpose:** create category with atomic RU/RO translations.
- **Access:** `requireAdmin()`.
- **UI map:**
  - `h1` `Новая категория`; description `Категория сохраняется атомарно вместе с двумя переводами.`
  - `select[name=parent_id]` label `Родительская категория`; option `Без родителя` default; archived/self excluded `[CODE admin-forms.tsx:138-146]`
  - `select[name=presentation_key]`: `generic` (selected), `fridge`, `stove`, `vacuum`; help `Для новых типов используйте generic.`
  - `input[name=sort_order]` label includes `Порядок`; default `0`
  - checkbox `is_published` label `Опубликована`
  - fieldsets `Русский` / `Română`: `Название` (`{loc}_name`, required, maxLength 240), `Slug` (`{loc}_slug`, pattern `[a-z0-9]+(?:-[a-z0-9]+)*`, maxLength 220, required), `Краткое описание` (`{loc}_short_description`, maxLength 500, required), `Полное описание` (`{loc}_description`, maxLength 5000, required), SEO title/description (optional; UI maxLength 70/160 `[CODE admin-forms.tsx:92,108]`)
  - button `Сохранить категорию` (`data-admin-form="category-save"` on form)
  - Locators: `getByLabel("Presentation key…")`, `page.locator('input[name="ru_name"]')`, `button:has-text("Сохранить категорию")`
- **Intended:** RU+RO required except SEO; slug latin lowercase; publish only with complete translations `[DOC §7.2-7.3]`; atomic translations `[CODE actions.ts:78-101]`; RPC upserts translations, sets `is_published` last `[CODE stage_6_admin_crud.sql:172-206]`.
- **Observed - success `[OBSERVED prod-like]`:**
  1. Fill RU/RO name/slug/desc, leave draft → submit
  2. Redirect `/admin/categories/{uuid}?saved=1`
  3. `[role=status]` `Изменения сохранены.`
  4. Header title = RU name; `ID: {uuid}` in description
  5. DB: `categories` + `category_translations` rows; slug reserved
- **Observed - failure:**

| trigger                          | expected                           | actual                                           | exact message                                                                                                                   | data changed? | tag                                     |
| -------------------------------- | ---------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------- |
| empty RO fields                  | server validation or HTML required | stays on `/admin/categories/new`, no admin alert | browser blocks required fields                                                                                                  | no            | `[OBSERVED]`                            |
| invalid slug `Bad Slug …`        | validation                         | stays on form (HTML `pattern`)                   | —                                                                                                                               | no            | `[OBSERVED]`                            |
| duplicate RU slug of existing    | server error                       | URL `…/categories/new?error=duplicate+key`       | `Такой slug, код или SKU уже используется.`                                                                                     | no new row    | `[OBSERVED]`, `[DB] unique locale+slug` |
| publish child under draft parent | clear parent message               | URL `?error=operation_failed`                    | `Операция не выполнена. Проверьте данные и повторите попытку.` (DB log: `Published child category requires a published parent`) | no            | `[OBSERVED]`, `[DB]`, server.err.log    |
| HTML5 empty name                 | block                              | stays                                            | —                                                                                                                               | no            | `[OBSERVED]`                            |

- **Data model:** `categories(parent_id, presentation_key, sort_order, is_published, archived_at)`, `category_translations(category_id, locale, name, slug, short_description, description, seo_title, seo_description)`, slug history/slug_routes; RPC `admin_save_category`.
- **Side effects:** revalidate catalog + `/admin/categories` `[CODE actions.ts:95-96]`.
- **Async:** server action ~1-3s; loading skeleton may flash `Загрузка`.
- **Test data:** unique slug via `formatRunSlug("cat", runId, "ru")`; presentationKey `generic`; seed category UUID for parent tests.
- **Existing e2e:** SMOKE-02 happy path (uses `input[name=...]` and `button:has-text("Сохранить категорию")`).
- **Proposed scenarios:**

| ID         | P   | Title                            | Steps                         | Expected                                                                                                        |
| ---------- | --- | -------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| ADM-CAT-03 | P0  | Create draft category            | fill RU+RO required, save     | `?saved=1`, `Изменения сохранены.`, DB row                                                                      |
| ADM-CAT-04 | P0  | Duplicate slug rejected          | create with existing slug     | `?error=duplicate key`, message `Такой slug…`, no row                                                           |
| ADM-CAT-05 | P0  | Empty RO blocked                 | omit RO, try save             | no redirect / HTML5; no DB row                                                                                  |
| ADM-CAT-06 | P1  | Invalid slug pattern             | `Bad Slug`, save              | client pattern blocks; if forced → `?error=validation` message `Проверьте обязательные поля и формат значений.` |
| ADM-CAT-07 | P1  | Publish with full RU/RO          | check `Опубликована`, save    | badge `Опубликована` on list                                                                                    |
| ADM-CAT-08 | P1  | Child publish under draft parent | child published, parent draft | `?error=operation_failed` + generic message (bug)                                                               |
| ADM-CAT-09 | P2  | SEO fields optional              | leave SEO empty, save         | success                                                                                                         |

- **Discrepancies:** SEO UI caps 70/160 vs server/doc 180/320 `[CODE admin-forms.tsx]` vs `[CODE actions.ts:72-74]`, `[DOC ADMIN_GUIDE.md §7.2]`; missing sanitizer for parent publish message.

---

## Section: Categories edit / image / archive — `/admin/categories/[id]`

- **Purpose:** edit translations/meta, replace image, archive/restore.
- **Access:** `requireAdmin()`; invalid UUID → not-found.
- **UI map:**
  - `h1` = RU name; description `ID: {uuid}`
  - `AdminNotice` error/success
  - `CategoryForm` same fields as create + hidden `id`
  - section `Изображение категории`: help text `JPEG, PNG, WebP или AVIF до 5 MiB. При замене прежний файл удаляется после сохранения metadata.`; `input[name=image]` file required accept image/jpeg,png,webp,avif; button `Загрузить изображение`; existing img public URL
  - section `Архив`: help `Категорию с активными товарами или подкатегориями архивировать нельзя. История slug сохраняется.`; Confirm button `Архивировать` / `Восстановить`; confirm message `Архивировать категорию?` / `Восстановить категорию как черновик?`
- **Intended:** replace image then delete old; archive blocked if products/children; restore as draft `[DOC §7.5-7.6]`; RPC checks products/children `[CODE admin_set_category_archived]`.
- **Observed - success:**
  - Edit + save: `?saved=1`, `Изменения сохранены.`, values persist
  - Image valid PNG: `?saved=1`, img element `category-images` present `[OBSERVED]`
  - Archive empty draft: `?saved=1`, success notice; badge on list `Архив`
  - Restore empty: `?saved=1`, back to draft
- **Observed - failure:**

| trigger                                                    | expected                     | actual                                   | message                                               | data changed?          | tag                            |
| ---------------------------------------------------------- | ---------------------------- | ---------------------------------------- | ----------------------------------------------------- | ---------------------- | ------------------------------ |
| archive category with products (`Холодильники` UUID …0001) | blocked                      | `?error=category_in_use`                 | `Категория используется товарами или подкатегориями.` | archived_at stays null | `[OBSERVED]`, `[DB]`           |
| image invalid type (.txt)                                  | upload_invalid or validation | `?error=validation`                      | `Проверьте обязательные поля и формат значений.`      | no upload              | `[OBSERVED]`                   |
| image oversize                                             | validation                   | same code path (not separately observed) | —                                                     | no                     | `[CODE validation.ts:139-155]` |

- **Data model:** categories, category_translations, bucket `category-images`, path `categories/{uuid}.{ext}` `[CODE validation.ts:167-171]`.
- **Side effects:** revalidate catalog; old image removed after new metadata `[CODE actions.ts:154-162]`; orphan cleanup log code `category_image_orphan`.
- **Async:** image upload longer; wait `?saved=1` or `?error=`; button pending `Сохранение…`.
- **Test data:** unique category via runId; invalid file fixture `.txt` / valid tiny PNG; for archive use own draft not seed.
- **Existing e2e:** none for edit/archive/image.
- **Proposed scenarios:**

| ID         | P   | Title                         | Expected                                                                         |
| ---------- | --- | ----------------------------- | -------------------------------------------------------------------------------- |
| ADM-CAT-10 | P0  | Edit name + slug              | save, list shows new name                                                        |
| ADM-CAT-11 | P0  | Archive empty draft + restore | archive then `Восстановить`, draft again                                         |
| ADM-CAT-12 | P0  | Archive used category blocked | seed with products → `Категория используется…`                                   |
| ADM-CAT-13 | P1  | Upload valid category image   | saved, img visible, DB `image_storage_path` set                                  |
| ADM-CAT-14 | P1  | Invalid image type blocked    | `?error=validation`                                                              |
| ADM-CAT-15 | P2  | Slug history redirect         | change slug of published category; old public URL redirects (needs public check) |

---

## Section: Attribute groups — `/admin/attribute-groups*`

- **Purpose:** logical groups for attributes (e.g. «Основные параметры»).
- **Access:** `requireAdmin()`.
- **UI map (list):** `h1` `Группы характеристик`; `Добавить группу`; badges `Активна`/`Выключена`, `{n} характеристик`; empty `Групп нет` / `Создайте группу для организации характеристик.`
- **UI map (new/edit form):** fields `Код` (`name=code`, pattern `[a-z][a-z0-9_]*`, maxLength 80, required), `Порядок` (`sort_order`, required), `Название RU`/`Название RO` (maxLength 160, required), checkbox `Активна` (default checked); button `Сохранить группу`
- **UI map (delete):** section `Удаление`; help `Удалить можно только пустую группу. Используемая группа завершит операцию понятной ошибкой.`; Confirm `Удалить группу`; message `Удалить пустую группу без возможности восстановления?`
- **Intended:** code technical stable; delete only empty `[DOC §8]`; RPC raises `attribute_group_in_use` if attributes exist `[CODE admin_delete_attribute_group]`.
- **Observed - success:** seed had **0 groups** (`Групп нет`) `[OBSERVED]`; create group with code `ag_{run}` → `?saved=1`, `Изменения сохранены.`, title `Группа {run}`.
- **Observed - failure:**

| trigger                         | expected           | actual                          | message                           | data changed? | tag          |
| ------------------------------- | ------------------ | ------------------------------- | --------------------------------- | ------------- | ------------ |
| delete group that has attribute | blocked            | `?error=attribute_group_in_use` | `Группа содержит характеристики.` | group remains | `[OBSERVED]` |
| invalid code `AG123`            | pattern/validation | HTML5 pattern blocks            | —                                 | no            | `[CODE]`     |
| empty required fields           | HTML5              | blocked                         | —                                 | no            | `[CODE]`     |

- **Data model:** attribute_groups, attribute_group_translations, attributes.group_id FK set null; RPCs `admin_save_attribute_group`, `admin_delete_attribute_group`.
- **Existing e2e:** none.
- **Proposed scenarios:**

| ID        | P   | Title                          | Expected                          |
| --------- | --- | ------------------------------ | --------------------------------- |
| ADM-AG-01 | P0  | Create group RU/RO             | `?saved=1`, list card             |
| ADM-AG-02 | P0  | Delete empty group             | redirect list `?saved=1`          |
| ADM-AG-03 | P0  | Delete non-empty group blocked | `Группа содержит характеристики.` |
| ADM-AG-04 | P1  | Invalid code                   | pattern/validation                |

---

## Section: Attributes — `/admin/attributes*`

- **Purpose:** product parameter metadata, options, category bindings.
- **Access:** `requireAdmin()`.
- **UI map (list):** `Добавить характеристику`; badges `Активна`/`Выключена`, `{dataType}`, `{n} категорий`; empty `Характеристик нет`.
- **UI map (new):** description `Сначала создайте метаданные RU/RO. Варианты и категории появятся после сохранения.`; fields `Код` (pattern, maxLength 80), `Группа` select, `Тип` select (`text`,`number`,`boolean`,`single_select`,`multi_select`,`color`; help about type change), `Код единицы` (optional, pattern), `Порядок`, checkboxes `Активна` (default on), `Фильтруемая`; RU/RO groups: `Название` required maxLength 160, `Подсказка` maxLength 500, `Обозначение единицы` maxLength 40; button `Сохранить характеристику`.
- **UI map (detail):** description `Код: {code} · тип: {dataType}`; section `Варианты` (only single/multi_select) — OptionForm fields `Код`,`Порядок`,`Label RU`,`Label RO`,`Активен`; buttons `Добавить вариант`/`Сохранить вариант`, Confirm `Удалить вариант` message `Удалить неиспользуемый вариант?`; non-select: `Для этого типа варианты не поддерживаются.`; section `Категории`: bindings with `Обязательная`, `Фильтр` (disabled for text), `Порядок`, buttons `Сохранить привязку`, `Отвязать`; unbound form button `Привязать`; delete section Confirm `Удалить характеристику` message `Удалить неиспользуемую характеристику?`
- **Intended:** types locked after values/options; options only for selects; unbind blocked if product values exist; delete only unused `[DOC §9]`.
- **Observed - success:** create number attribute `at_{run}` with group → `?saved=1`; create free attribute then delete → list `?saved=1`; option add/delete on select attribute → `?saved=1` `[OBSERVED]`; bind attribute to category → `?saved=1`.
- **Observed - failure:**

| trigger                         | expected | actual                          | message                                          | data changed?  | tag          |
| ------------------------------- | -------- | ------------------------------- | ------------------------------------------------ | -------------- | ------------ |
| change type after options exist | blocked  | `?error=Cannot+change+the+type` | `Тип используемой характеристики менять нельзя.` | type unchanged | `[OBSERVED]` |
| invalid code                    | pattern  | HTML5                           | —                                                | no             | `[CODE]`     |

- **Data model:** attributes, attribute_translations, attribute_options (+translations), category_attributes, product_attribute_values; RPCs `admin_save_attribute`, `admin_save_attribute_option`, `admin_delete_attribute_option`, `admin_set_category_attribute`, `admin_delete_attribute`.
- **Side effects:** revalidate catalog after mutations.
- **Test data:** unique codes `at_{run}`, `sel_{run}`; category seed UUID …0001.
- **Existing e2e:** factories exist (`e2e/helpers/factories/attribute.ts`) but no admin UI spec for attributes.
- **Proposed scenarios:**

| ID          | P   | Title                              | Expected                                                       |
| ----------- | --- | ---------------------------------- | -------------------------------------------------------------- |
| ADM-ATTR-01 | P0  | Create attribute RU/RO             | `?saved=1`                                                     |
| ADM-ATTR-02 | P0  | Options only on select types       | number type shows `Для этого типа варианты не поддерживаются.` |
| ADM-ATTR-03 | P0  | Add + delete option                | saved each time                                                |
| ADM-ATTR-04 | P0  | Bind category required/filter      | `Сохранить привязку` saved                                     |
| ADM-ATTR-05 | P1  | Type change after options blocked  | `Тип используемой характеристики менять нельзя.`               |
| ADM-ATTR-06 | P1  | Delete free attribute              | list without it                                                |
| ADM-ATTR-07 | P2  | Delete used attribute blocked      | `Характеристика уже используется.` / `in_use`                  |
| ADM-ATTR-08 | P2  | Text type filter checkbox disabled | `Фильтр` disabled on binding form                              |

---

## Section: Products list — `/admin/products`

- **Purpose:** search/filter product catalog.
- **Access:** `requireAdmin()`.
- **UI map:**
  - `h1` `Товары`; `Добавить товар`
  - filter form method GET: `Поиск` placeholder `Название, бренд, модель или SKU` (`name=q`); `Категория` select (`Все` + category names); `Статус` select: `Все`, `Опубликованные` (`published`), `Черновики` (`draft`), `Архив` (`archived`); button `Применить`
  - cards: title RU name; meta `{brand} {model} · {sku} · {price} MDL`; badges publication + availability raw code (`in_stock` etc.)
  - empty with filters: `Ничего не найдено` / `Измените параметры поиска.`; without: `Товаров нет` / `Создайте первый товар как черновик.`
  - Locators: `getByLabel("Поиск")`, `select[name=publication]`, `button:has-text("Применить")`, card link by SKU text
- **Intended:** search RU/RO name, brand, model, SKU; filters category/publication; max 250 last updated `[DOC §10.1]`, `[CODE repository.ts:241-277]`.
- **Observed - success:** list shows seed `Samsung RB34T602FSA` etc.; search `q={run}` filters to created product; `publication=draft` lists drafts; `publication=published` listed 107 cards after analysis `[OBSERVED]`.
- **Observed - failure:** anonymous login redirect; empty search results → empty state text `[OBSERVED partial]`.
- **Data model:** products + product_translations; client-side filter after limit 250.
- **Existing e2e:** none for list/filters.
- **Proposed scenarios:**

| ID          | P   | Title                                       | Expected                         |
| ----------- | --- | ------------------------------------------- | -------------------------------- |
| ADM-PROD-01 | P0  | List seed products                          | cards with brand/model/SKU/price |
| ADM-PROD-02 | P0  | Search by SKU                               | filter unique SKU → 1 card       |
| ADM-PROD-03 | P1  | Publication filter published/draft/archived | badges match filter              |
| ADM-PROD-04 | P1  | Empty search empty state                    | `Ничего не найдено`              |

---

## Section: Products create — `/admin/products/new`

- **Purpose:** create product draft (then publish later).
- **Access:** `requireAdmin()`.
- **UI map:**
  - `h1` `Новый товар`; description `Создайте базовый товар. Характеристики и фотографии добавляются после первого сохранения.`
  - `category_id` required select; option text may append ` — черновик` for unpublished categories `[CODE admin-forms.tsx:447-449]`
  - `brand` required maxLength 120; `model` maxLength 160; `sku` maxLength 80
  - `price` MoneyInput required placeholder `0.00`; `old_price` optional
  - `availability` select `in_stock`/`out_of_stock`/`on_order`; `quantity` optional integer; `sort_order` required
  - checkboxes `Новинка`, `Опубликован`
  - RU/RO TranslationFields with product description maxLength 10000
  - button `Сохранить товар` (`data-admin-form="product-save"`)
  - Locators: `select[name=category_id]`, `input[name=price]`, `button:has-text("Сохранить товар")`
- **Intended:** draft first; publish requires complete RU/RO + published category + required attrs + alt texts `[DOC §10.2, §10.6]`; price format major MDL; old_price must be strictly greater `[CODE actions.ts:350-353]`.
- **Observed - success:** fill published category + full translations, draft → `?saved=1`, `Изменения сохранены.`, product id in URL; checklist items visible on editor `[OBSERVED]`.
- **Observed - failure:**

| trigger                          | expected      | actual                                                   | message                                          | data changed? | tag                                |
| -------------------------------- | ------------- | -------------------------------------------------------- | ------------------------------------------------ | ------------- | ---------------------------------- |
| `old_price` < `price` (50 < 100) | validation    | `?error=validation` on `/admin/products/new`             | `Проверьте обязательные поля и формат значений.` | no product    | `[OBSERVED]`                       |
| empty required fields            | HTML5         | blocked                                                  | —                                                | no            | `[OBSERVED]/[CODE]`                |
| publish with only RU             | server reject | _not fully observed_ — publish with full RU+RO succeeded | —                                                | —             | `[CODE actions.ts:372]` + triggers |

- **Data model:** products (price_minor, old_price_minor, availability, quantity, is_published, archived_at), product_translations; RPC `admin_save_product`; DB checks `old_price_minor > price_minor`, MDL currency `[DOC docs/security.md]`.
- **Side effects:** revalidate catalog `/admin/products`.
- **Test data:** unique SKU `SKU-{run}`; category published seed …0001; draft categories show ` — черновик`.
- **Existing e2e:** product factory exists; no admin create product spec yet.
- **Proposed scenarios:**

| ID          | P   | Title                            | Expected                                               |
| ----------- | --- | -------------------------------- | ------------------------------------------------------ |
| ADM-PROD-05 | P0  | Create draft product             | `?saved=1`, draft badge                                |
| ADM-PROD-06 | P0  | Publish draft with complete data | badge `Опубликован`, `Витрина RU/RO` links, public 200 |
| ADM-PROD-07 | P0  | old_price <= price rejected      | validation message, no product                         |
| ADM-PROD-08 | P1  | Publish without RO               | `Для публикации товара нужны полные переводы RU и RO.` |
| ADM-PROD-09 | P1  | Publish under draft category     | `Сначала опубликуйте выбранную категорию.`             |
| ADM-PROD-10 | P2  | Invalid price format             | validation                                             |

---

## Section: Products editor / attributes / images / archive / preview — `/admin/products/[id]*`

- **Purpose:** full product maintenance.
- **Access:** `requireAdmin()`; invalid/unknown UUID → not-found `Запись не найдена`.
- **UI map:**
  - header: title RU name; description `{brand} {model} · {sku}`
  - status badge `Черновик`/`Опубликован`/`Архив`; buttons `Preview RU`, `Preview RO`; if published+both translations: `Витрина RU`, `Витрина RO` (target `_blank` → `/ru/product/{slug}`, `/ro/product/{slug}`)
  - checklist labels: `Категория опубликована`, `Переводы RU и RO заполнены`, `Обязательные характеристики заполнены`, `Alt-тексты изображений заполнены` with ✓/×
  - `ProductForm` (same as create + hidden id)
  - section `Характеристики`: empty text `К категории не привязаны характеристики.`; else fieldsets per bound attribute; button `Сохранить характеристики`
  - section `Изображения`: upload form `data-admin-form="image-upload"` — `image` file required, `alt_ru`/`alt_ro` required maxLength 240, `sort_order`, `is_primary` (default on if no images), button `Загрузить изображение` pending `Загрузка…`; per image: path text, badges `Главное`/`Ожидает очистки`, link `Открыть файл`; forms `Сохранить изображение`, Confirm `Удалить изображение` message `Удалить изображение из каталога и Storage?`; pending state text `Завершите очистку через раздел «Проверка файлов».`
  - section `Архив`: Confirm `Архивировать`/`Восстановить`
  - Locators: `data-admin-form="product-save"|"image-upload"|"archive-product"`; `getByRole("link", { name: "Preview RU" })`
- **Intended:** attributes from category bindings; empty optional values deleted; image delete multi-step mark→storage→finalize; archive keeps history; preview admin-only even for drafts `[DOC §10.5-10.8]`.
- **Observed - success `[OBSERVED prod-like]`:**
  - publish with full data: checklist all ✓, `Витрина RU/RO` appear
  - upload valid PNG with alts: `?saved=1`, `Изменения сохранены.`, image card with badge `Главное`
  - archive product: `?saved=1`, badge `Архив`; public `GET /ru/product/{slug}` → **404**
  - restore product: `?saved=1`
  - preview RU: main shows `← К редактору`, badge `Защищённый preview RU`, brand/model/sku, name, price MDL, description, `Характеристики`
  - preview locale `xx` → `Запись не найдена`
- **Observed - failure:**

| trigger                       | expected                         | actual                                                                            | message                                          | data changed? | tag                         |
| ----------------------------- | -------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ | ------------- | --------------------------- |
| image empty alts              | required / server alt validation | HTML5 required blocks submit                                                      | —                                                | no upload     | `[OBSERVED]/[CODE]`         |
| invalid image type            | validation                       | (same class as category image)                                                    | `Проверьте обязательные поля и формат значений.` | no            | `[OBSERVED pattern]`        |
| publish missing required attr | server reject                    | _observed success in one run_ — checklist showed ✓; may mean binding not required | —                                                | published     | `[OBSERVED]` need isolation |
| unknown product UUID          | not-found                        | `Запись не найдена`                                                               | —                                                | no            | `[OBSERVED]`                |

- **Data model:** products, product_translations, product_attribute_values (+translations), product_images (+translations, deletion_pending_at), bucket `product-images` path `{product_uuid}/{random}.{ext}` `[CODE validation.ts:158-165]`; RPCs `admin_save_product`, `admin_replace_product_attribute_values`, `admin_create/update_product_image`, `admin_mark/cancel/finalize_product_image_deleting`, `admin_set_product_archived`.
- **Side effects:** revalidate catalog; image compensation removes object on metadata failure `[CODE actions.ts:504-512]`.
- **Async:** upload slower (`Загрузка…`); archive confirm `window.confirm`; public storefront cache may need revalidation delay (observed 404 immediately after archive `[OBSERVED]`).
- **Test data:** own product via runId; tiny PNG buffer fixture; for required-attr tests create attribute bound required on category carefully and verify binding in UI.
- **Existing e2e:** none for product editor.
- **Proposed scenarios:**

| ID          | P   | Title                                      | Expected                           |
| ----------- | --- | ------------------------------------------ | ---------------------------------- |
| ADM-PROD-11 | P0  | Checklist + publish + storefront links     | public product 200 after publish   |
| ADM-PROD-12 | P0  | Archive product hides storefront           | public 404; admin badge `Архив`    |
| ADM-PROD-13 | P0  | Upload image with alts                     | saved; image listed; primary badge |
| ADM-PROD-14 | P0  | Delete image confirm                       | dialog; image removed after accept |
| ADM-PROD-15 | P1  | Preview RU for draft                       | protected preview content          |
| ADM-PROD-16 | P1  | Required attribute missing publish blocked | specific error (verify isolation)  |
| ADM-PROD-17 | P1  | Product attributes save                    | values in DB/public                |
| ADM-PROD-18 | P2  | Invalid locale preview                     | not-found                          |

---

## Section: Leads list / filters / export — `/admin/leads`

- **Purpose:** process customer leads; export CSV.
- **Access:** `requireAdmin()` for page and CSV route.
- **UI map:**
  - `h1` `Заявки`; filters GET: `Поиск` placeholder `Имя или телефон` (`q`); `Статус` select codes `new|in_progress|contacted|closed|spam`; `Источник` select includes `home_contact`…`assistant`; `Язык` `RU`/`RO`; `Товар` select product names; `С даты`/`По дату` (`date_from`,`date_to` type date); buttons `Применить`, `Экспорт CSV`
  - cards: name, meta `{phone} · {LOCALE} · {dateTime ru-RU}`; badges status + optional `Telegram: {state}`
  - empty: `Заявок не найдено` / `Измените фильтры или дождитесь новой заявки.`
  - Locators: `getByLabel("Поиск")`, `select[name=status]`, `getByRole("link", { name: "Экспорт CSV" })`
- **Intended:** filters server-side; list limit 100; CSV limit 5000 with formula-escape `[DOC §12]`, `[CODE leads/export/route.ts:6-9,23]`.
- **Observed - success `[OBSERVED prod-like]`:**
  - create lead via `POST /api/leads` with `Idempotency-Key`, `Origin: http://localhost:3000` → **201** `{"ok":true}`
  - list search by runId finds lead card
  - CSV GET authenticated: **200**, `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="tehnosklad-leads-2026-09-30.csv"`, body starts `﻿"id","created_at","status",...` (BOM)
- **Observed - failure:**

| trigger             | expected       | actual                 | message                                                                               | data changed? | tag          |
| ------------------- | -------------- | ---------------------- | ------------------------------------------------------------------------------------- | ------------- | ------------ |
| API missing consent | 422            | status 422             | `{"ok":false,"code":"validation_error","fieldErrors":{"consent":"consent_required"}}` | no            | `[OBSERVED]` |
| API foreign Origin  | 403            | status 403             | `{"ok":false,"code":"forbidden"}`                                                     | no            | `[OBSERVED]` |
| anonymous CSV       | redirect login | login HTML 200 not CSV | —                                                                                     | no            | `[OBSERVED]` |

- **Data model:** leads (immutable contact fields via triggers), lead_status_history, lead_telegram_deliveries, lead_delivery_attempts; RPC `admin_set_lead_status`.
- **Lead API schema (observed `[CODE validation.ts]`):** JSON fields `name`, `phone`, `telegram` (not `telegramUsername`), `comment`, `locale`, `source`, `sourcePath`, `consent:true`; optional `productId`; header `Idempotency-Key` UUID required; same-origin Origin.
- **Existing e2e:** lead factory exists; no admin leads spec.
- **Proposed scenarios:**

| ID          | P   | Title                            | Expected                                 |
| ----------- | --- | -------------------------------- | ---------------------------------------- |
| ADM-LEAD-01 | P0  | API create lead appears in admin | card in list with name/phone             |
| ADM-LEAD-02 | P0  | Status filter                    | filter `new` shows only new              |
| ADM-LEAD-03 | P0  | CSV export                       | 200, csv headers, filename               |
| ADM-LEAD-04 | P1  | API validation errors            | 422 consent_required; 403 foreign origin |
| ADM-LEAD-05 | P1  | Anonymous CSV blocked            | login redirect                           |

---

## Section: Leads detail / status / Telegram requeue — `/admin/leads/[id]`

- **Purpose:** work a lead; change status; requeue Telegram outbox.
- **Access:** `requireAdmin()`; UUID check.
- **UI map:**
  - `h1` lead name; description `Заявка {id} · {createdAt ru-RU}`
  - sections `Контакт` (Телефон tel link, Telegram, Комментарий, Источник, Согласие), `Snapshot товара`, `Статус` (select + button `Изменить статус`), history list `создана → new` / `new → in_progress` + `Изменил: {uuid|система}`, `Telegram delivery`
  - delivery block (when `lead.delivery` truthy): badge state, `Попыток`, `Message ID`, `Последняя ошибка`; attempts cards; if state not succeeded/processing: form with optional `confirm_uncertain` for `manual_review` + button `Повторно отправить в Telegram`
  - when delivery null: `Delivery отсутствует.`
  - Locators: `select[name=status]`, `button:has-text("Изменить статус")`, `getByRole("button", { name: "Повторно отправить в Telegram" })`
- **Intended:** admin changes only status; history audit with changed_by; requeue only non-successful states; `manual_review` requires confirm `[DOC §12-13]`; Telegram empty config → `permanent_failure`.
- **Observed - success:**
  - detail shows contact/source/history
  - change status to `in_progress` then double-click toward `contacted`: `?saved=1`, `Изменения сохранены.`, history rows `new → in_progress`, `in_progress → contacted`, `Именил: {admin_uuid}`
  - `[DB]` after API create: `lead_telegram_deliveries.state=permanent_failure`, `attempt_count=1`, `last_error_code=telegram_config_missing`
  - dashboard card `Ошибки Telegram` increments when outbox in `permanent_failure`/`manual_review`
- **Observed - failure / BUG:**

| trigger                                    | expected                     | actual                                            | message | data changed?              | tag                                              |
| ------------------------------------------ | ---------------------------- | ------------------------------------------------- | ------- | -------------------------- | ------------------------------------------------ |
| lead with outbox `permanent_failure` in DB | show delivery + retry button | UI shows `Delivery отсутствует.`; no retry button | —       | status history still works | `[OBSERVED]`, `[DB]`, `[CODE repository.ts:517]` |
| anonymous detail                           | login redirect               | —                                                 | —       | no                         | `[OBSERVED pattern]`                             |

**Root-cause hypothesis `[INFERRED]`:** `mapLead` does `row.lead_telegram_deliveries[0]` `[CODE repository.ts:517]`. PostgREST to-one embed may return an **object**, not array (service-role select returned object). `object[0]` is undefined → UI treats delivery as missing. RLS policy allows admin select `[CODE stage_5_leads_telegram.sql:531-532]`; grants include select `[lines 539-541]`. Requeue UI therefore unreachable for local no-Telegram leads.

- **Data model:** leads, lead_status_history(changed_by → profiles), lead_telegram_deliveries, lead_delivery_attempts; RPC `admin_set_lead_status`, `admin_requeue_lead_telegram_delivery`; then `processTelegramDelivery` server-side `[CODE actions.ts:695-718]`.
- **Side effects:** requeue RPC + immediate delivery processing; outbox attempts logged.
- **Async:** status change server action; requeue may be slower (Telegram HTTP timeout when token empty).
- **Test data:** lead via public API with unique comment/name; avoid rate limits (5/15min IP, 3/hour phone) `[DOC docs/security.md]`.
- **Existing e2e:** none.
- **Proposed scenarios:**

| ID          | P   | Title                                    | Expected                                                                                |
| ----------- | --- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| ADM-LEAD-06 | P0  | Detail shows contact + history           | fields visible; history rows                                                            |
| ADM-LEAD-07 | P0  | Change status new→in_progress            | `?saved=1`; history audit; DB status                                                    |
| ADM-LEAD-08 | P0  | Outbox visible with retry UI             | **currently fails** — document as bug; test asserts current actual OR desired after fix |
| ADM-LEAD-09 | P1  | manual_review requires confirm_uncertain | submit without checkbox blocked by HTML required                                        |
| ADM-LEAD-10 | P1  | Requeue after permanent_failure          | attempt_count increments; still permanent_failure without Telegram                      |
| ADM-LEAD-11 | P2  | Double status submit                     | one history row for final status (observed single final)                                |

---

## Section: Assistant knowledge — `/admin/assistant-knowledge*`

- **Purpose:** bilingual articles for grounded assistant answers.
- **Access:** `requireAdmin()`.
- **UI map:**
  - list: `Добавить статью`; badges `Активна`/`Выключена`, `Русский`/`Română`; empty `Статей нет` + helper text about catalog/contacts until articles added
  - new: description `Статью нужно добавить отдельно для каждого языка.`; `locale` select `Русский`/`Română`; checkbox `Активна` default on; `title` maxLength 160 help `Заголовок (по нему помощник находит статью, например «Доставка»)`; `content` maxLength 5000 help `Текст ответа (помощник отвечает только тем, что здесь написано)`; button `Сохранить статью`
  - delete: Confirm `Удалить статью без возможности восстановления?`
- **Intended:** one article per locale; delete irreversible; prefer deactivate `[DOC §15]`.
- **Observed - success:** seed 12 active articles (RU+RO); create article → `?saved=1`, `Изменения сохранены.`; deactivate+delete → list `?saved=1` `[OBSERVED]`.
- **Observed - failure:** empty title blocked by HTML5 required (no server error observed) `[OBSERVED]`.
- **Data model:** assistant_knowledge; RPCs `admin_save_assistant_knowledge`, `admin_delete_assistant_knowledge`.
- **Existing e2e:** none.
- **Proposed scenarios:**

| ID        | P   | Title               | Expected                         |
| --------- | --- | ------------------- | -------------------------------- |
| ADM-KB-01 | P0  | Create RU article   | saved; list card Активна Русский |
| ADM-KB-02 | P0  | Create RO article   | Română badge                     |
| ADM-KB-03 | P1  | Deactivate + delete | list without article             |
| ADM-KB-04 | P2  | Empty title blocked | no create                        |

---

## Section: Assistant logs — `/admin/assistant-logs`

- **Purpose:** anonymized request telemetry.
- **Access:** `requireAdmin()`.
- **UI map:**
  - nav `Период`: links `7 дней`, `30 дней`, `90 дней` → `?days=N`
  - when total>0: cards `Всего запросов`, `Ответы без AI-провайдера`, `Товаров в ответе в среднем`; share lists `Результат ответа`, `Провайдер`, `Скорость ответа`, `Язык вопроса`; table `Последние запросы` columns Время/Язык/Результат/Провайдер/Скорость/Товаров/Запрос
  - empty: `Запросов нет` + text about service-role/demo
  - Locators: `getByRole("link", { name: "30 дней" })`, table headers exact
- **Intended:** period from query param; no question text/IP `[DOC §16]`; sample cap 5000 `[CODE repository.ts:709-710]`.
- **Observed - success `[OBSERVED prod-like]`:** with local service-role key present, page showed `Всего запросов 4`, share bars, table rows with `deterministic_fallback`, providers `Встроенный режим (без AI)`, `Детерминированный ответ (без AI)`, locale RU; `days=30` keeps param in URL; `days=999` falls back to default 7 `[CODE page.tsx:95-96]` `[OBSERVED]`.
- **Discrepancies:** ADMIN_GUIDE says telemetry often empty on local/dev without service-role; local `.env.local` has service role so logs **are** written `[DOC ADMIN_GUIDE.md §16.3]` vs `[OBSERVED]`.
- **Existing e2e:** none.
- **Proposed scenarios:**

| ID          | P   | Title                    | Expected                 |
| ----------- | --- | ------------------------ | ------------------------ |
| ADM-LOGS-01 | P1  | Period switch 7/30/90    | URL days=N; cards render |
| ADM-LOGS-02 | P2  | Invalid days falls back  | still default report     |
| ADM-LOGS-03 | P2  | Empty period empty state | `Запросов нет`           |

---

## Section: Settings — `/admin/settings`

- **Purpose:** edit 7 public site settings RU/RO pairs only.
- **Access:** `requireAdmin()`.
- **UI map:**
  - description `Только публичный whitelist. Telegram token, service-role key и произвольные ключи недоступны.`
  - per setting form `data-admin-form="setting-{key}"`: hidden `key`; h2 `{label} {key}`; textareas `ru`/`ro` maxLength 1000 required; button `Сохранить настройку`
  - keys observed: `phone_display`, `phone_href`, `address`, `open_days`, `open_time`, `closed_day`, `contact_text` with seed values `[OBSERVED]`
  - Locators: `form[data-admin-form="setting-address"]`, `getByRole("button", { name: "Сохранить настройку" })`
- **Intended:** both languages required; max 1000; only whitelist keys; RPC pair update `[DOC §6]`, `[CODE admin_set_public_site_setting_pair]`.
- **Observed - success:** save `address` RU/RO with suffix → `?saved=1`; public `/ru` (contacts page content) contained updated address fragment `[OBSERVED]`.
- **Observed - failure:**

| trigger                   | expected                   | actual                         | message                                          | data changed?    | tag          |
| ------------------------- | -------------------------- | ------------------------------ | ------------------------------------------------ | ---------------- | ------------ |
| empty/whitespace RU+RO    | validation                 | `?error=validation`            | `Проверьте обязательные поля и формат значений.` | values unchanged | `[OBSERVED]` |
| non-whitelist key via RPC | `site_setting_not_allowed` | UI cannot submit arbitrary key | —                                                | —                | `[CODE]`     |

- **Data model:** site_settings(key, locale, value); whitelist 7 keys; RPC `admin_set_public_site_setting_pair`; column grants restrict update `[DOC docs/rls-access-matrix.md]`.
- **Side effects:** revalidate catalog/settings; public site footer/contacts reflect values.
- **Existing e2e:** none.
- **Proposed scenarios:**

| ID         | P   | Title                   | Expected                              |
| ---------- | --- | ----------------------- | ------------------------------------- |
| ADM-SET-01 | P0  | Save address pair       | `?saved=1`; public page contains text |
| ADM-SET-02 | P0  | Empty value rejected    | validation message                    |
| ADM-SET-03 | P1  | Phone display/href save | public tel link update                |

---

## Section: Media orphans — `/admin/media/orphans`

- **Purpose:** reconcile `product-images` Storage vs `product_images` metadata.
- **Access:** `requireAdmin()`.
- **UI map:**
  - description `Сверка product-images Storage и metadata. Исправление всегда повторно проверяет состояние на сервере.`
  - empty: `Orphan-файлов нет` / `Storage и metadata согласованы.`
  - entry cards: badge `Файл без metadata` | `Metadata без файла` | `Незавершённое удаление`; path mono; link `Открыть товар`; Confirm button `Очистить` or `Восстановить / завершить`; messages per state `[CODE media/orphans/page.tsx:62-74]`
  - Locators: `getByText("Orphan-файлов нет")`, card by path text, button `Очистить`
- **Intended:** scan up to 1000 folders/objects `[CODE repository.ts:625-671]`; re-check before mutate; three states `[DOC §14]`.
- **Observed - success `[OBSERVED prod-like]`:**
  - empty state when consistent
  - orphan object: upload storage object without metadata via service role → card `Файл без metadata` + path; Confirm `Очистить` → `?saved=1`, empty state; object removed from storage
  - missing metadata: insert `product_images` row without object → card `Metadata без файла`; `Очистить` → empty state; row removed
- **Observed - failure:** no orphan entries → empty state (not an error).
- **Data model:** product_images, product-images storage; RPC mark/cancel/finalize deleting for pending_metadata.
- **Existing e2e:** none.
- **Proposed scenarios:**

| ID          | P   | Title                         | Expected                                                    |
| ----------- | --- | ----------------------------- | ----------------------------------------------------------- |
| ADM-ORPH-01 | P0  | Empty orphans state           | `Orphan-файлов нет`                                         |
| ADM-ORPH-02 | P0  | Clean orphan object           | object gone from storage                                    |
| ADM-ORPH-03 | P0  | Clean missing metadata        | row gone from DB                                            |
| ADM-ORPH-04 | P2  | pending_metadata restore path | create deletion_pending_at; reconcile restores or finalizes |

---

## Cross-cutting sections

### 1) Authentication and session

- Login via server action; session cookies from Supabase SSR `[CODE lib/supabase/server.ts]`.
- Proxy refreshes claims on `/admin*` `[CODE proxy.ts]`, sets `Cache-Control: private, no-store`.
- Prod-like: cookies may be `Secure`; local HTTP localhost — Playwright still works for admin login observed `[OBSERVED]`; public locale cookie test failure is known `[DOC local-test-env.md]`.
- Logout: `signOut({scope:'local'})` then `/admin/login` `[CODE auth/actions.ts:41-44]` `[OBSERVED]`.
- `next` handling: safe path only `/admin…`; login rejects external/`/admin/login` as next `[CODE auth/redirect.ts]`.
- Auth setup project writes `playwright/.auth/admin.json` `[CODE e2e/auth.setup.ts]`.

### 2) Authorization matrix (observed + code)

| Action                     | Anonymous                                          | Non-admin                     | Admin                       |
| -------------------------- | -------------------------------------------------- | ----------------------------- | --------------------------- |
| GET `/admin*` pages        | login redirect                                     | login redirect                | 200                         |
| POST server actions        | blocked (no session)                               | blocked                       | RPC                         |
| RPC `admin_*` via Data API | denied                                             | denied (`private.is_admin()`) | execute allowed             |
| Leads Data API             | denied                                             | denied                        | read; status update via RPC |
| Storage product-images     | public URL read if known; insert/delete admin only | denied insert                 | insert/delete allowed       |
| CSV export                 | login HTML                                         | login HTML                    | CSV download                |

### 3) i18n in admin

- Admin UI hard-coded Russian strings in components/dictionaries not used for admin chrome `[CODE admin-navigation.tsx]`, `[CODE admin pages]`.
- Locale only for **content** fields RU/RO (categories, products, attributes, knowledge, settings).
- Public storefront locales `ru`/`ro` separate from admin locale.
- Date formatting in admin: `toLocaleString("ru-RU")` `[CODE leads page, assistant logs]`.

### 4) Error handling conventions

- Server action errors → redirect query code → `AdminNotice` via `adminErrorMessage`.
- HTML5 `required`/`pattern`/`minLength` often block before server — tests must distinguish client vs server errors.
- Unmapped SQL messages → `Операция не выполнена. Проверьте данные и повторите попытку.` (seen for parent publish).
- not-found page for bad UUIDs; error.tsx for unexpected render failures.

### 5) Media / storage conventions

| Bucket            | Path pattern                  | Limits          | Who          |
| ----------------- | ----------------------------- | --------------- | ------------ |
| `product-images`  | `{product_uuid}/{random}.{jpg | png             | webp         | avif}` | 5 MiB, magic bytes | admin upload via server |
| `category-images` | `categories/{random}.{ext}`   | same validation | admin upload |

- No overwrite (`upsert:false`); no UPDATE storage policy `[DOC docs/security.md]`.
- Delete product image: mark pending → storage remove → finalize; cancel on storage error `[CODE actions.ts:555-571]`.
- Orphans page is the supported repair path for product-images only (not category-images) `[DOC §18.6 note]`.

### 6) Slug / redirect system

- Unique `(locale, slug)`; reserved after rename so old links redirect `[CODE errors.ts comments]`.
- Invalid format blocked by HTML pattern + server `slugPattern` `[CODE validation.ts:7,78-82]`.
- Duplicate → `Такой slug, код или SKU уже используется.` `[OBSERVED]`.
- Known test cleanup issue: `adminDb.cleanUpByRunId` deletes categories without first deleting slug_routes; FK RESTRICT leaves orphans `[DOC docs/local-test-env.md]`, `[CODE e2e/helpers/admin-db.ts:88-107]`.
- Observed leftover draft categories without translations after prior e2e `[OBSERVED]`.

### 7) Data reset / test isolation recommendations

- Unique names: `generateRunId()` format `E2E-YYYYMMDD-HHMMSS-RAND` `[CODE e2e/fixtures/run-id.ts]`; slugs `formatRunSlug`.
- Cleanup order if extending helper: leads → product_images → product_attribute_values → product_translations → products → category_attributes → category_translations → **slug_routes** → categories → attribute_options → attributes → attribute_groups → assistant_knowledge → storage objects.
- When cleanup unreliable: `npm run db:reset:local` then `node scripts/local-test/ensure-admin.mjs` (reset deletes admin).
- Mutating scripts must refuse non-local Supabase URL.
- One server on :3000 only; production-like preferred for admin tests.

### 8) Lead pipeline without Telegram

- Create lead → DB + status history + outbox via trigger/submit RPC.
- Processing without `TELEGRAM_*` → `permanent_failure`, `last_error_code=telegram_config_missing` `[OBSERVED]`, `[DB]`.
- Admin dashboard counts permanent_failure/manual_review as `Ошибки Telegram`.
- Requeue intended UI hidden in current observed state due to delivery embed bug; RPC `admin_requeue_lead_telegram_delivery` exists `[CODE stage_6_7…:105-119]`.
- Real Telegram delivery not verifiable locally; can stub only if code allowed env override — currently requires token env, no base-URL override for bot API `[CODE leads/delivery] INFERRED]`.

---

## Coverage matrix (route × scenarios)

| Area              | Route                         | Scenarios proposed | P0     | P1     | P2     | Existing e2e         |
| ----------------- | ----------------------------- | ------------------ | ------ | ------ | ------ | -------------------- |
| Auth              | `/admin/login`                | 7                  | 5      | 1      | 1      | partial (setup only) |
| Dashboard         | `/admin`                      | 4                  | 1      | 3      | 0      | partial smoke        |
| Categories list   | `/admin/categories`           | 3                  | 1      | 1      | 1      | no                   |
| Categories create | `/admin/categories/new`       | 7                  | 3      | 3      | 1      | partial SMOKE-02     |
| Categories edit   | `/admin/categories/[id]`      | 6                  | 3      | 2      | 1      | no                   |
| Attr groups       | `/admin/attribute-groups*`    | 4                  | 3      | 1      | 0      | no                   |
| Attributes        | `/admin/attributes*`          | 8                  | 4      | 3      | 1      | no                   |
| Products list     | `/admin/products`             | 4                  | 2      | 2      | 0      | no                   |
| Products create   | `/admin/products/new`         | 6                  | 3      | 2      | 1      | no                   |
| Products editor   | `/admin/products/[id]*`       | 8                  | 4      | 3      | 1      | no                   |
| Leads list/export | `/admin/leads*`               | 5                  | 3      | 2      | 0      | no                   |
| Lead detail       | `/admin/leads/[id]`           | 6                  | 3      | 2      | 1      | no                   |
| Knowledge         | `/admin/assistant-knowledge*` | 4                  | 2      | 1      | 1      | no                   |
| Assistant logs    | `/admin/assistant-logs`       | 3                  | 0      | 1      | 2      | no                   |
| Settings          | `/admin/settings`             | 3                  | 2      | 1      | 0      | no                   |
| Orphans           | `/admin/media/orphans`        | 4                  | 3      | 0      | 1      | no                   |
| **Total**         |                               | **82**             | **42** | **29** | **11** |                      |

Counts in matrix are planned scenario IDs listed in sections; P0 = auth + core CRUD + status + settings + export + archive/storefront effects.

---

## Prioritized Playwright test plan (implementation order)

Shared fixtures/helpers worth writing first:

1. **`login storageState`** — reuse `playwright/.auth/admin.json` via existing `setup` project.
2. **`unique runId factory`** — `generateRunId()` + slug/sku helpers already in `e2e/helpers/factories`.
3. **DB cleanup helper** — extend `adminDb.cleanUpByRunId` to delete **slug_routes** before categories; optional `db:reset` flag.
4. **Non-admin helper** — create Auth user + active profile, no role; teardown deletes user.
5. **Lead factory** — `POST /api/leads` with Origin + Idempotency-Key + runId comment (not rate-limit spam: max 1-2 leads/test).
6. **Image fixtures** — tiny valid PNG/JPEG buffers; invalid `.txt`.

Suggested order:

| Order | Phase                                    | Suites                                                      |
| ----- | ---------------------------------------- | ----------------------------------------------------------- |
| 1     | P0 auth                                  | ADM-AUTH-01..05                                             |
| 2     | P0 dashboard + categories create/archive | ADM-DASH-01, ADM-CAT-03..05, ADM-CAT-10..12                 |
| 3     | P0 products create/publish/archive       | ADM-PROD-05..07, ADM-PROD-11..12                            |
| 4     | P0 leads                                 | ADM-LEAD-01..03, ADM-LEAD-06..07                            |
| 5     | P0 settings                              | ADM-SET-01..02                                              |
| 6     | P1 attributes/groups/images              | ADM-AG-_, ADM-ATTR-_, ADM-PROD-13..15, ADM-CAT-13..14       |
| 7     | P1 knowledge/logs/orphans                | ADM-KB-_, ADM-ORPH-_, ADM-LOGS-01                           |
| 8     | P2 polish                                | next params, SEO limits, preview invalid locale, mobile nav |

Run against production-like server on :3000; `reuseExistingServer: true`.

---

## Bugs and discrepancies (consolidated)

| ID     | Area                         | Description                                                                                     | Evidence                                                                                                                                                                                                                                                                                                                                                                                       | Severity         |
| ------ | ---------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| BUG-01 | SEO fields UI vs server      | CountedInput maxLength 70/160 vs server/doc 180/320                                             | `[CODE admin-forms.tsx:92,108]`, `[CODE actions.ts:72-74]`, `[DOC ADMIN_GUIDE.md §7.2]`                                                                                                                                                                                                                                                                                                        | Medium           |
| BUG-02 | Dashboard Telegram card      | `Ошибки Telegram` → unfiltered `/admin/leads`                                                   | `[CODE page.tsx:22]`                                                                                                                                                                                                                                                                                                                                                                           | Low              |
| BUG-03 | e2e cleanup                  | `cleanUpByRunId` doesn't delete slug_routes before categories; orphans/UUID options             | `[CODE e2e/helpers/admin-db.ts]`, `[DOC local-test-env.md]`, `[OBSERVED]`                                                                                                                                                                                                                                                                                                                      | High for tests   |
| BUG-04 | Error sanitizer miss         | `Published child category requires a published parent` → generic `Операция не выполнена…`       | server.err.log, `[CODE errors.ts:26-28]`, migration line 54                                                                                                                                                                                                                                                                                                                                    | Medium           |
| BUG-05 | Lead delivery UI             | Outbox exists in DB (`permanent_failure`) but UI `Delivery отсутствует.`; requeue button hidden | `[OBSERVED]`, `[DB]`, `[CODE repository.ts:517]`                                                                                                                                                                                                                                                                                                                                               | **High**         |
| BUG-06 | Image invalid type message   | Category/product image wrong type → generic `validation` not `upload_invalid`                   | `[OBSERVED]`, `[CODE actions.ts:131]` maps AdminValidationError field `image` → code `validation` via actionCode? actually throws AdminValidationError("image") then sanitizeAdminError — need note: AdminValidationError goes through `sanitizeAdminError` which doesn't know field names; `actionCode` uses `error instanceof AdminValidationError ? "validation"` `[CODE actions.ts:39-42]` | Low              |
| DOC-01 | Assistant logs empty locally | Guide says telemetry often empty without service-role; local env has key → logs present         | `[DOC §16.3]` vs `[OBSERVED]`                                                                                                                                                                                                                                                                                                                                                                  | Low (doc)        |
| DOC-02 | Draft categories without RO  | UI can only save with full RU/RO; leftover drafts exist from DB tooling                         | `[DOC §7.2]` vs `[OBSERVED]` orphan drafts                                                                                                                                                                                                                                                                                                                                                     | Medium for tests |

---

## Open questions / inferred / not verifiable

| Item                                           | Status                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Lead delivery embed object vs array root cause | `[INFERRED]` from service-role JSON shape + code `[0]`; needs PostgREST response capture with admin JWT to confirm |
| Required-attribute publish enforcement         | Observed one successful publish without filling attr; may be binding not marked required — retest in isolation     |
| Category public slug redirect after rename     | Not fully observed; code reserves slug history `[CODE errors.ts]`                                                  |
| Telegram real delivery / 429 retry             | Not verifiable without bot token; no local mock endpoint in code `[INFERRED]`                                      |
| Production HTTPS Secure cookies                | Not verifiable on localhost HTTP; known for locale cookie only                                                     |
| Double-submit concurrent edits                 | Limited observation; server actions not designed idempotent beyond RPC upserts                                     |
| Mobile admin drawer behavior                   | Code exists (`☰`, Escape) `[CODE admin-navigation.tsx]`; not exercised in this run                                |
| `pending_metadata` orphan UI                   | State defined; not force-tested beyond code path                                                                   |

---

## Self-check

- [x] Every admin route in inventory has a section (login, dashboard, categories list/new/edit, attribute-groups, attributes, products list/new/editor, leads list/detail/export, knowledge, logs, settings, orphans).
- [x] Failure-path rows have observed results or explicit not-verified notes.
- [x] No secrets written (only env var names; no keys/passwords).
- [x] Locators/messages from real observation or CODE/DOC, not memory.
- [x] Evidence tags present on non-trivial claims.
- [x] Nothing in src/, migrations, e2e specs, configs changed for product code (report + temp scripts only).

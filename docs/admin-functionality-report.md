# Отчёт об функциональности административной панели Tehnosklad

Назначение документа: источник фактов для написания Playwright-тестов `/admin`.
Формат: для каждого раздела — purpose, access, UI map, intended/observed behavior (success/failure), data model, side effects, async notes, test data, existing coverage, proposed scenarios, discrepancies, not-verifiable.

**Evidence tags:** `[CODE path:line]` · `[OBSERVED]` (сервер: dev или prod-like) · `[DOC file]` · `[DB]` · `[INFERRED]`

**Среда наблюдения (этот прогон):** production-like (`next build --webpack` + `npm start`, порт 3000), Supabase local `127.0.0.1:54321`, `CATALOG_DATA_SOURCE=supabase`, `AI_PROVIDER=fallback`, Telegram-переменные пусты → lead delivery `permanent_failure`.

**Учётные данные:** ссылки на `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` из `.env.local` (см. `docs/local-test-env.md`). Значения секретов в отчёт не вносятся.

---

## Executive summary

Админка — серверный App Router backoffice на `/admin` (язык интерфейса: русский, `[DOC ADMIN_GUIDE.md §22]`, `[CODE src/app/(backoffice)/admin/layout.tsx]`). Доступ: proxy (`updateAdminSession`) на `getClaims()` → redirect на `/admin/login?next=…`; layout/страницы/actions дополнительно вызывают `requireAdmin()` = `getUser()` + `profiles.is_active` + `user_roles.role='admin'` `[CODE src/features/admin/auth/guard.ts:15-45]`. Мутации идут через server actions → `admin_*` RPC under RLS; service-role client используется только для storage/anonymous paths. UI почти без data-testid; локаторы — role/label/text/`name=` form fields.

Мутации возвращают redirect `?saved=1` или `?error=<code>`; сообщения читает `AdminNotice` из `adminErrorMessage()` `[CODE src/components/admin/admin-ui.tsx:33-54]`, `[CODE src/features/admin/errors.ts:107-119]`. Успех UI-текст: `Изменения сохранены.` (с точкой). Ошибки — безопасные RU-строки из `knownMessages`/`codeMessages`, без SQL/stack.

Каталог: категории (иерархия, RU/RO, slug, image bucket `category-images`, архив), attribute groups/attributes (types, options, category bindings), products (draft/publish/archive, attributes, images `product-images`, checklist, preview, витрина). Заявки: list/filter, detail, status history, Telegram outbox + audited requeue. Settings: 7 public keys, RU/RO pair save. Media orphans: scan product-images vs metadata. Assistant knowledge: bilingual articles CRUD. Assistant logs: anonymized telemetry (may be empty locally).

Существующее e2e-покрытие admin: **SMOKE-01** (dashboard + nav), **SMOKE-02** (create category UI + DB verify + cleanup), **admin-navigation-styles** (hover CSS). Остальные admin-маршруты **не покрыты**.

Приоритеты тестов: P0 — auth/redirect, category/product create+save+publish rules, lead status, settings, errors; P1 — attributes/options/bindings, images, knowledge, orphans, CSV export, archive; P2 — i18n edge, timing, concurrent/double-submit, non-admin matrix.

---

## Route inventory

| URL | Page file | Purpose | Server actions / RPCs | Tables |
|-----|-----------|---------|----------------------|--------|
| `/admin/login` | `src/app/(backoffice)/admin/login/page.tsx` | Login form | `signInAdmin` → Supabase Auth `signInWithPassword` | auth.users, profiles, user_roles |
| `/admin` | `…/(protected)/page.tsx` | Dashboard stats + recent leads | `getAdminDashboard` (reads only) | products, categories, leads, lead_telegram_deliveries, assistant_knowledge |
| `/admin/categories` | `…/categories/page.tsx` | Category list | `listAdminCategories` | categories, category_translations, products |
| `/admin/categories/new` | `…/categories/new/page.tsx` | Create category | `saveCategoryAction` → `admin_save_category` | categories, category_translations, slug_routes |
| `/admin/categories/[id]` | `…/categories/[id]/page.tsx` | Edit category + image + archive | `saveCategoryAction`, `uploadCategoryImageAction` → `admin_set_category_image`, `setCategoryArchivedAction` → `admin_set_category_archived` | categories, category_translations, category-images storage |
| `/admin/attribute-groups` | `…/attribute-groups/page.tsx` | Group list | `listAdminAttributeGroups` | attribute_groups, attribute_group_translations, attributes |
| `/admin/attribute-groups/new` | `…/attribute-groups/new/page.tsx` | Create group | `saveAttributeGroupAction` → `admin_save_attribute_group` | attribute_groups, attribute_group_translations |
| `/admin/attribute-groups/[id]` | `…/attribute-groups/[id]/page.tsx` | Edit/delete group | `saveAttributeGroupAction`, `deleteAttributeGroupAction` → `admin_delete_attribute_group` | attribute_groups, attributes |
| `/admin/attributes` | `…/attributes/page.tsx` | Attribute list | `listAdminAttributes` | attributes, attribute_translations, attribute_options, category_attributes |
| `/admin/attributes/new` | `…/attributes/new/page.tsx` | Create attribute | `saveAttributeAction` → `admin_save_attribute` | attributes, attribute_translations |
| `/admin/attributes/[id]` | `…/attributes/[id]/page.tsx` | Edit attribute, options, category bindings, delete | `saveAttributeAction`, `saveAttributeOptionAction`, `deleteAttributeOptionAction`, `setCategoryAttributeAction`, `deleteAttributeAction` + matching RPCs | attributes, options, category_attributes, product_attribute_values |
| `/admin/products` | `…/products/page.tsx` | Product list + filters | `listAdminProducts`, `listAdminCategories` | products, product_translations |
| `/admin/products/new` | `…/products/new/page.tsx` | Create product draft | `saveProductAction` → `admin_save_product` | products, product_translations |
| `/admin/products/[id]` | `…/products/[id]/page.tsx` | Product editor + attrs + images + archive | `saveProductAction`, `saveProductAttributesAction`, `uploadProductImageAction`, `updateProductImageAction`, `deleteProductImageAction`, `setProductArchivedAction` | products, product_translations, product_attribute_values, product_images, product-images storage |
| `/admin/products/[id]/preview/[locale]` | `…/products/[id]/preview/[locale]/page.tsx` | Admin-only preview | (read) | products + translations (public RLS?) |
| `/admin/leads` | `…/leads/page.tsx` | Lead list + filters + CSV export link | `listAdminLeads`, `listAdminProducts` | leads, lead_status_history, lead_telegram_deliveries |
| `/admin/leads/[id]` | `…/leads/[id]/page.tsx` | Lead detail, status, Telegram requeue | `setLeadStatusAction` → `admin_set_lead_status`, `retryLeadTelegramDeliveryAction` → `admin_requeue_lead_telegram_delivery` + `processTelegramDelivery` | leads, lead_status_history, lead_telegram_deliveries, lead_delivery_attempts |
| `/admin/leads/export` | `…/leads/export/route.ts` | CSV export GET | `listAdminLeads` limit 5000 | leads (read) |
| `/admin/assistant-knowledge` | `…/assistant-knowledge/page.tsx` | Article list | `listAdminAssistantKnowledge` | assistant_knowledge |
| `/admin/assistant-knowledge/new` | `…/assistant-knowledge/new/page.tsx` | Create article | `saveAssistantKnowledgeAction` → `admin_save_assistant_knowledge` | assistant_knowledge |
| `/admin/assistant-knowledge/[id]` | `…/assistant-knowledge/[id]/page.tsx` | Edit/delete article | `saveAssistantKnowledgeAction`, `deleteAssistantKnowledgeAction` | assistant_knowledge |
| `/admin/assistant-logs` | `…/assistant-logs/page.tsx` | Assistant telemetry report | `getAdminAssistantLogReport` | assistant_logs |
| `/admin/settings` | `…/settings/page.tsx` | Public site settings RU/RO | `saveSiteSettingAction` → `admin_set_public_site_setting_pair` | site_settings |
| `/admin/media/orphans` | `…/media/orphans/page.tsx` | Storage vs metadata reconcile | `scanAdminProductOrphans`, `cleanupOrphanImageAction` (legacy path in actions; UI uses `reconcileImageEntryAction`) | product_images, product-images storage |

Auth/role model:

| Layer | Check | Anonymous | Non-admin authenticated | Admin |
|-------|-------|-----------|-------------------------|-------|
| Proxy `/admin*` | `getClaims()` only `[CODE src/lib/supabase/proxy.ts:60-72]` | redirect `/admin/login?next=…` | claims ok → layout guard rejects | pass |
| Protected layout | `requireAdmin()` `[CODE …/(protected)/layout.tsx:15]` | redirect login | redirect login | header shows email · admin |
| Each page | `requireAdmin()` | redirect login | redirect login | load data |
| Each server action | `requireAdmin()` first `[CODE src/features/admin/actions.ts]` | unauthenticated action → login redirect | blocked | RPC under RLS |
| RLS / RPC | `private.is_admin()` / admin policies | no access | no write | full admin write |
| CSV export route | `requireAdmin()` `[CODE leads/export/route.ts:13]` | redirect | blocked | CSV |

Existing e2e coverage per route:

| Route | Existing spec | What is covered | Gap |
|-------|---------------|-----------------|-----|
| `/admin` | `e2e/admin-smoke.spec.ts` SMOKE-01 | banner visible, nav links, metric cards text | metric values, card links, recent leads |
| `/admin/categories/new` | SMOKE-02 | create draft category UI, DB row, `Изменения сохранены` | validation failures, publish rules, archive, image, slugs |
| `/admin/login` | `e2e/auth.setup.ts` | UI login with storageState | wrong password, non-admin, expired session, next param |
| Admin nav CSS | `e2e/admin-navigation-styles.spec.ts` | hover colors on synthetic link | mobile drawer, active state |
| Other admin routes | — | — | all failure paths, permissions, forms |

---

## Shared UI / error conventions

- **AdminNotice success:** `[role=status]` text `Изменения сохранены.` `[CODE admin-ui.tsx:47-51]`
- **AdminNotice error:** `[role=alert]` text from `adminErrorMessage(code)` `[CODE admin-ui.tsx:40-45]`
- **Redirect after mutation:** `…?saved=1` or `…?error=<code>` `[CODE src/features/admin/actions.ts:45-50]`
- **Submit button pending:** `Сохранение…` / `Загрузка…` (see `submit-button.tsx`)
- **Confirm dialogs:** `ConfirmSubmitButton` uses `window.confirm(message)` — exact messages per form
- **Nav labels (exact):** Обзор, Категории, Группы характеристик, Характеристики, Товары, Заявки, База знаний помощника, Статистика помощника, Публичные настройки, Проверка файлов `[CODE src/components/admin/admin-navigation.tsx:7-18]`
- **Header:** `Tehnosklad Admin`, email · role, button `Выйти` `[CODE …/(protected)/layout.tsx:46-56]`
- **Skip link:** `К содержимому` → `#admin-main`
- **Main landmark:** `<main id="admin-main" class="admin-content">`
- **Error message catalog (exact RU):** see table below (from `errors.ts`)

| code / needle | UI message |
|---------------|------------|
| `admin_required` | `Требуется активная роль администратора.` |
| `category_in_use` | `Категория используется товарами или подкатегориями.` |
| `category_parent_cycle` | `Категория не может быть собственным потомком.` |
| `attribute_group_in_use` | `Группа содержит характеристики.` |
| `attribute_in_use` | `Характеристика уже используется.` |
| `attribute_option_in_use` | `Вариант уже используется в товарах.` |
| `category_attribute_in_use` | `Характеристика заполнена у товаров этой категории.` |
| `product_category_attributes_incompatible` | `Сначала очистите несовместимые характеристики товара.` |
| `Published category requires` | `Для публикации категории нужны полные переводы RU и RO.` |
| `Published product requires ru and ro` | `Для публикации товара нужны полные переводы RU и RO.` |
| `Published product requires a published category` | `Сначала опубликуйте выбранную категорию.` |
| `missing a required attribute` | `Заполните все обязательные характеристики.` |
| `images require ru and ro alt` | `У каждого изображения должны быть alt-тексты RU и RO.` |
| `incomplete attribute metadata` | `Проверьте переводы и активность характеристик и вариантов.` |
| `Cannot change the type` | `Тип используемой характеристики менять нельзя.` |
| `canonical filters` | `Текстовая характеристика не может быть каноническим фильтром.` |
| `duplicate key` / `duplicate` | `Такой slug, код или SKU уже используется.` / `Такое значение уже используется.` |
| `slug is reserved by another category` | `Этот адрес (slug) уже занят другой категорией, в том числе переименованной или архивной. Выберите другой.` |
| `slug is reserved by another product` | `Этот адрес (slug) уже занят другим товаром, в том числе переименованным или архивным. Выберите другой.` |
| `site_setting_not_allowed` | `Эту настройку редактировать нельзя.` |
| `assistant_knowledge_incomplete` | `Заполните заголовок и текст статьи базы знаний.` |
| `assistant_knowledge_not_found` | `Статья базы знаний не найдена.` |
| `in_use` (FK 23503) | `Сущность используется и не может быть удалена.` |
| `validation` | `Проверьте обязательные поля и формат значений.` |
| `upload_invalid` | `Файл должен быть JPEG, PNG, WebP или AVIF размером до 5 МБ.` |
| `operation_failed` / unknown | `Операция не выполнена.` / `Операция не выполнена. Проверьте данные и повторите попытку.` |
| login | `Вход не выполнен. Проверьте данные и наличие активной роли администратора.` `[CODE login/page.tsx:81-84]` |
| config missing | `Supabase Auth не настроен. Добавьте публичный URL и publishable key согласно docs/supabase-setup.md.` |

**SEO field discrepancy (doc vs UI):** ADMIN_GUIDE says SEO title max 180 / description 320; server validation uses those maxima `[CODE actions.ts:72-74]`, but CountedInput UI caps SEO title at 70 and description at 160 `[CODE admin-forms.tsx:92,108]`. Documented in bugs table.

---

## Section: Login / auth session — `/admin/login`

- **Purpose / who uses it:** entry to backoffice for admin users; only way into `/admin/*`.
- **Access:** public page; if already admin and env configured → `redirect(next)` `[CODE login/page.tsx:31]`. Proxy on protected routes: no claims → `/admin/login?next=<path>` `[CODE proxy.ts:62-72]`.
- **UI map:**
  - `main` → card: logo img alt `Техносклад`
  - `h1`: `Вход для администратора`
  - subtitle: `Используйте учётную запись Supabase Auth с активной ролью admin.`
  - form `action=signInAdmin`: hidden `next`; labels `Email` (input `name=email`, type email, required, maxLength 254, autocomplete username); `Пароль` (input `name=password`, type password, required, minLength 8, maxLength 256); button `Войти`
  - error alert when `?error=` present
  - Locators: `getByRole("heading", { name: "Вход для администратора" })`, `getByLabel("Email")`, `getByLabel("Пароль")`, `getByRole("button", { name: "Войти" })`, `page.locator('input[type="email"]')`, `input[type="password"]`, `button:has-text("Войти")`
- **Intended behavior:** same neutral error for wrong password and missing admin role `[DOC ADMIN_GUIDE.md §2.3]`, `[DOC docs/security.md]`; password min 8; email lowercase-trim; non-admin local logout; `next` only same-origin `/admin` paths; no recovery form `[CODE auth/actions.ts:14-38]`, `[CODE auth/redirect.ts]`.
- **Observed behavior - success paths:** *pending observation via exploration script*
- **Observed behavior - failure paths:** *pending observation*
- **Data model touched:** auth.users, public.profiles, public.user_roles; cookies Supabase SSR session.
- **Side effects / audit:** failed login: no app audit table (Supabase Auth logs only); non-admin: local signOut then error redirect.
- **Async / timing notes:** server action redirect (303-style); wait for `waitForURL(/\/admin(?!\/login)/)` as in `auth.setup.ts`.
- **Test data & preconditions:** `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`; non-admin helper: create auth user + `profiles.is_active=true` without `user_roles.admin`, delete after; anonymous storageState empty.
- **Existing e2e coverage:** `auth.setup.ts` happy path only.
- **Proposed Playwright scenarios:** *to be filled after observation*
- **Discrepancies & bugs found:** *pending*
- **Not verifiable locally:** production HTTPS cookie Secure behavior for session cookie (local HTTP localhost); noted in `docs/local-test-env.md`.

---

## Section: Dashboard — `/admin`

- **Purpose / who uses it:** daily overview; quick links to leads/products/knowledge.
- **Access:** `requireAdmin()` in page + layout `[CODE page.tsx:10]`.
- **UI map:**
  - `h1` `Панель управления`; description `Состояние каталога, заявок, Telegram delivery и базы знаний помощника.`
  - `section[aria-label=Статистика]` cards (labels exact): `Всего товаров`, `Опубликовано`, `Нет в наличии`, `Категории`, `Новые заявки`, `Ошибки Telegram`, `Статьи базы знаний`
  - Card hrefs: `/admin/products`, `/admin/products?publication=published`, `/admin/products`, `/admin/categories`, `/admin/leads?status=new`, `/admin/leads`, `/admin/assistant-knowledge`
  - `h2` `Последние заявки` + link `Все заявки` → `/admin/leads`; empty text `Заявок пока нет.`
  - Locators: `getByRole("link", { name: "Товары" })` in `nav`; `main.getByText("Всего товаров")`; `getByRole("link", { name: /Категории/ })` (SMOKE-01)
- **Intended behavior:** 7 metrics + last 5 leads; cards are links `[DOC ADMIN_GUIDE.md §5]`.
- **Observed behavior - success paths:** *pending*
- **Observed behavior - failure paths:** *pending (anonymous/non-admin)*
- **Data model touched:** counts from products/categories/leads/outbox/assistant_knowledge; recent leads via `listAdminLeads({limit:5})`.
- **Side effects / audit:** none (read-only).
- **Async / timing notes:** all server-rendered; revalidate after mutations elsewhere.
- **Test data & preconditions:** seed has products/categories; lead/outbox counts depend on seed + test creates.
- **Existing e2e coverage:** SMOKE-01 partial.
- **Proposed Playwright scenarios:** *pending*
- **Discrepancies:** dashboard card `Ошибки Telegram` links to `/admin/leads` without delivery-state filter — may not show filtered failures `[CODE page.tsx:22]`.
- **Not verifiable locally:** production telemetry numbers.

---

## Sections to fill (loop)

Each of the following MUST get a full template section after observation. Mark filled when committed.

- [ ] Login / auth session — `/admin/login`
- [ ] Dashboard — `/admin`
- [ ] Categories list — `/admin/categories`
- [ ] Categories create — `/admin/categories/new`
- [ ] Categories edit / image / archive — `/admin/categories/[id]`
- [ ] Attribute groups list/new/edit/delete — `/admin/attribute-groups*`
- [ ] Attributes list/new/edit/options/bindings/delete — `/admin/attributes*`
- [ ] Products list/search/filter — `/admin/products`
- [ ] Products create — `/admin/products/new`
- [ ] Products editor / attributes / images / archive / preview — `/admin/products/[id]*`
- [ ] Leads list/filters/export — `/admin/leads`
- [ ] Leads detail / status / Telegram requeue — `/admin/leads/[id]`
- [ ] Assistant knowledge — `/admin/assistant-knowledge*`
- [ ] Assistant logs — `/admin/assistant-logs`
- [ ] Settings — `/admin/settings`
- [ ] Media orphans — `/admin/media/orphans`
- [ ] Cross-cutting: auth matrix
- [ ] Cross-cutting: i18n in admin
- [ ] Cross-cutting: error conventions
- [ ] Cross-cutting: media/storage
- [ ] Cross-cutting: slug/redirects
- [ ] Cross-cutting: test isolation
- [ ] Cross-cutting: lead pipeline without Telegram
- [ ] Coverage matrix + prioritized test plan
- [ ] Bugs & discrepancies consolidated
- [ ] Open questions / not verifiable

---

## Coverage matrix (route × scenario)

Filled in Phase 4.

## Prioritized Playwright test plan

Filled in Phase 4.

## Bugs and discrepancies

| ID | Area | Description | Evidence | Severity guess |
|----|------|-------------|----------|----------------|
| BUG-01 | SEO UI vs server limits | CountedInput 70/160 vs server 180/320 | `[CODE admin-forms.tsx:92,108]` vs `[CODE actions.ts:72-74]` | Medium |
| BUG-02 | Dashboard Telegram card | `Ошибки Telegram` → unfiltered `/admin/leads` | `[CODE page.tsx:22]` | Low |
| BUG-03 | e2e cleanup | `cleanUpByRunId` does not delete slug_routes before categories (FK RESTRICT) | `[DOC docs/local-test-env.md]`, `[CODE e2e/helpers/admin-db.ts:88-107]` | High for tests |
| BUG-04 | (to observe) | *pending* | | |

## Open questions / inferred / not verifiable

Filled as observation proceeds.

---

*Report written in progress — sections appended after each observation batch.*

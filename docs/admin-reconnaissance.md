# Отчет об исследовании административной панели Tehnosklad (Admin Panel Reconnaissance)

## 1. Executive Summary

Административная панель **Tehnosklad** представляет собой строго типизированное серверное веб-приложение на базе **Next.js 16.3 (App Router)** и **Supabase (PostgreSQL 15+ / PostgREST / Storage / Auth)**.

Панель предназначена для управления двуязычным каталогом бытовой техники (русский и румынский языки: `ru` / `ro`), конструктором характеристик, обработкой клиентских заявок (leads), мониторингом очереди доставки сообщений в Telegram, публичными настройками магазина и целостностью медиа-файлов в Supabase Storage.

Ключевые архитектурные свойства:

- **Zero-trust клиент**: Административный интерфейс построен преимущественно на React Server Components. Мутации выполняются через Server Actions с 4-уровневой защитой: `requireAdmin()` в Server Action -> строгая Zod-подобная валидация в TypeScript -> атомарные PostgreSQL RPC (`SECURITY INVOKER`) с повторным вызовом `private.is_admin()` -> Row Level Security (RLS) и Database Constraints.
- **Service-role изоляция**: Административный CRUD намеренно **не использует** `SUPABASE_SERVICE_ROLE_KEY`. Все действия выполняются от имени аутентифицированного администратора с токеном сессии. Сервисный ключ изолирован в серверных API публичных заявок.
- **Двуязычность как инвариант**: Все публичные сущности (категории, товары, характеристики, группы, варианты, настройки сайта) требуют синхронного заполнения на `ru` и `ro`.
- **Защита целостности данных**: В базе реализованы отложенные триггеры публикации (`DEFERRABLE INITIALLY DEFERRED`), проверка циклических зависимостей дерева категорий, защита типов характеристик от изменения при наличии значений, безопасный двухфазный процесс удаления изображений и иммутабельные снимки (snapshots) товаров в заявках.
- **Текущее тестовое покрытие**: Существует 102 юнит-теста и интеграционный тестовый сценарий (Stage 6 integration harness). Однако **Playwright E2E тесты для административной панели на данный момент полностью отсутствуют** (существующие Playwright-тесты покрывают исключительно витрину магазина в demo-режиме и 1 проверку CSS-стилей навигации).

---

## 2. Application Architecture

```mermaid
graph TD
    Browser[Admin Browser] -->|HTTPS Requests / Cookies| Proxy[Next.js Proxy / Middleware]
    Proxy -->|Session Refresh & Path Header| NextApp[Next.js App Router]

    subgraph Admin Layer
        Layout[Protected Layout / requireAdmin]
        Pages[Server Components Pages]
        Actions[Server Actions]
        Validation[Validation Layer / validation.ts]
        Repo[Admin Repository / repository.ts]
    end

    NextApp --> Layout
    Layout --> Pages
    Pages --> Repo
    Browser -->|Form POST / Multipart| Actions
    Actions --> Validation
    Validation --> Repo

    subgraph Supabase Layer
        SupabaseClient[Authenticated Supabase Client]
        RPC[Atomic admin_* RPCs / SECURITY INVOKER]
        RLS[PostgreSQL RLS Policies]
        DB[(PostgreSQL Database)]
        Storage[Supabase Storage: product-images / category-images]
    end

    Repo --> SupabaseClient
    SupabaseClient -->|PostgREST RPC| RPC
    RPC --> RLS
    RLS --> DB
    Repo -->|Storage API| Storage
```

### 2.1. Маршрутизация и структура

- Маршруты админки сгруппированы в App Router: `src/app/(backoffice)/admin/`.
- Общедоступный маршрут входа: `/admin/login`.
- Защищенная группа маршрутов: `src/app/(backoffice)/admin/(protected)/` под единым `layout.tsx`, принудительно использующим `export const dynamic = "force-dynamic"` и `Cache-Control: private, no-store`.
- Middleware (`src/proxy.ts`) перехватывает все обращения к `/admin*`, обновляет Auth cookies пользователя через `@supabase/ssr` (`updateAdminSession`) и прокидывает заголовок `x-tehnosklad-pathname`.

### 2.2. Слои мутации данных

1. **Server Action Entrypoint**: Первым вызовом исполняется `await requireAdmin()`. Если токен невалиден или роль отсутствует, происходит моментальный `redirect("/admin/login")`.
2. **TypeScript Validation (`src/features/admin/validation.ts`)**:
   - Парсинг и очистка строк (trimming, regex для кодов/слагов `^[a-z0-9]+(?:-[a-z0-9]+)*$`).
   - Проверка допустимых диапазонов чисел и строгой структуры UUID v4.
   - Финансовая арифметика: конвертация MDL-строки в целочисленные копейки/бани (`bigint minor units`) без использования `float`.
   - Валидация загружаемых изображений (размер до 5 МБ, проверка MIME-типа, расширения и сигнатур magic bytes).
3. **Database RPC (`supabase/migrations/20260805213001_stage_6_admin_crud.sql`)**:
   - Вызов соответствующей функции `admin_*`.
   - Внутри RPC первой инструкцией проверяется `if not (select private.is_admin()) then raise exception 'admin_required' using errcode = '42501'; end if;`.
4. **Cache Invalidation & Redirection**:
   - После успешного выполнения вызывается `revalidateCatalogAfterMutation(type)` с тегами `catalog`, `categories`, `products`, `settings` и `revalidatePath()`.
   - Клиент перенаправляется (HTTP 303 Redirect) на целевой URL с параметром `?saved=1` или `?error=<code>`.

---

## 3. Admin Access & Authorization

### 3.1. Модель аутентификации

- Аутентификация базируется на **Supabase Auth (GoTrue)** по паре `Email + Password`.
- Пароль: минимум 8 символов, максимум 256. Email: до 254 символов.
- Публичная регистрация отключена на уровне конфигурации Supabase.
- Пользователь создается вручную через Supabase Dashboard или SQL от имени доверенной роли.

### 3.2. Авторизация и роли

Для получения административного доступа пользователь обязан иметь:

1. Запись в `auth.users`.
2. Активный профиль в таблице `public.profiles`: `is_active = true`.
3. Запись в таблице `public.user_roles`: `role = 'admin'::public.app_role`.

> [!IMPORTANT]
> Метаданные из `auth.users.raw_user_meta_data` системой игнорируются и не дают никаких прав. Функция `private.is_admin()` проверяет исключительно таблицы `public.profiles` и `public.user_roles`.

### 3.3. Безопасность при ошибках входа

- При неверном логине, пароле, неактивном профиле или отсутствии роли `admin` страница `/admin/login` возвращает унифицированную ошибку: `?error=credentials`.
- Это предотвращает атаку типа User Enumeration (перечисление существующих email-адресов).

---

## 4. Admin Navigation: Карта разделов и страниц

| Раздел                            | Путь URL                          | Назначение                                                                                                  | Иконка |
| --------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- | :----: |
| **Обзор**                         | `/admin`                          | Сводка каталога, счетчики статусов, новые заявки, ошибки Telegram                                           |  `⌂`   |
| **Категории**                     | `/admin/categories`               | Дерево категорий, переводы, slug, иерархия, публикация, архивация                                           |  `▦`   |
| **Новая категория**               | `/admin/categories/new`           | Создание категории с переводами RU/RO                                                                       |   —    |
| **Редактирование категории**      | `/admin/categories/[id]`          | Редактор категории, загрузка обложки, архивирование/восстановление                                          |   —    |
| **Группы характеристик**          | `/admin/attribute-groups`         | Список групп характеристик (например, «Основные параметры»)                                                 |  `▤`   |
| **Новая группа**                  | `/admin/attribute-groups/new`     | Создание группы характеристик                                                                               |   —    |
| **Редактирование группы**         | `/admin/attribute-groups/[id]`    | Редактирование группы характеристик, удаление пустой группы                                                 |   —    |
| **Характеристики**                | `/admin/attributes`               | Список характеристик, их типы данных и количество привязок                                                  |  `⚙`   |
| **Новая характеристика**          | `/admin/attributes/new`           | Создание характеристик с переводами RU/RO и выбором типа                                                    |   —    |
| **Редактирование характеристики** | `/admin/attributes/[id]`          | Редактор метаданных, управление вариантами (Select), привязка к категориям, удаление                        |   —    |
| **Товары**                        | `/admin/products`                 | Каталог товаров, фильтры по категории и статусу, полнотекстовый поиск                                       |  `□`   |
| **Новый товар**                   | `/admin/products/new`             | Создание базовой карточки товара (черновик)                                                                 |   —    |
| **Редактирование товара**         | `/admin/products/[id]`            | Редактор данных товара, заполнение характеристик, загрузка и сортировка фото, чеклист публикации, архивация |   —    |
| **Предпросмотр товара RU**        | `/admin/products/[id]/preview/ru` | Защищенный предпросмотр карточки на русском языке                                                           |   —    |
| **Предпросмотр товара RO**        | `/admin/products/[id]/preview/ro` | Защищенный предпросмотр карточки на румынском языке                                                         |   —    |
| **Заявки**                        | `/admin/leads`                    | Журнал клиентских заявок, фильтрация по датам, статусу, источнику, языку, товару, поиск, экспорт CSV        |  `✉`   |
| **Карточка заявки**               | `/admin/leads/[id]`               | Детали заявки, контакты, снимок товара, история статусов, лог доставки Telegram, ручной повтор              |   —    |
| **Экспорт заявок**                | `/admin/leads/export`             | Защищенный Route Handler выгрузки CSV (до 5000 записей)                                                     |   —    |
| **Публичные настройки**           | `/admin/settings`                 | Редактирование 7 фиксированных контактов и графиков работы магазина RU/RO                                   |  `☷`  |
| **Проверка файлов**               | `/admin/media/orphans`            | Сверка объектов в Storage `product-images` с записями в БД, устранение расхождений                          |  `⌕`   |

---

## 5. Entities & Data Models

```mermaid
erDiagram
    PROFILES ||--o{ USER_ROLES : has
    PROFILES ||--o{ LEAD_STATUS_HISTORY : changes
    CATEGORIES ||--o{ CATEGORIES : parent_of
    CATEGORIES ||--|{ CATEGORY_TRANSLATIONS : localized_by
    CATEGORIES ||--o{ CATEGORY_ATTRIBUTES : binds
    CATEGORIES ||--o{ PRODUCTS : contains

    ATTRIBUTE_GROUPS ||--|{ ATTRIBUTE_GROUP_TRANSLATIONS : localized_by
    ATTRIBUTE_GROUPS ||--o{ ATTRIBUTES : groups

    ATTRIBUTES ||--|{ ATTRIBUTE_TRANSLATIONS : localized_by
    ATTRIBUTES ||--o{ ATTRIBUTE_OPTIONS : defines
    ATTRIBUTES ||--o{ CATEGORY_ATTRIBUTES : bound_to
    ATTRIBUTES ||--o{ PRODUCT_ATTRIBUTE_VALUES : values_of

    ATTRIBUTE_OPTIONS ||--|{ ATTRIBUTE_OPTION_TRANSLATIONS : localized_by
    ATTRIBUTE_OPTIONS ||--o{ PRODUCT_ATTRIBUTE_VALUES : selected_in

    PRODUCTS ||--|{ PRODUCT_TRANSLATIONS : localized_by
    PRODUCTS ||--o{ PRODUCT_IMAGES : has
    PRODUCTS ||--o{ PRODUCT_ATTRIBUTE_VALUES : configured_with
    PRODUCTS ||--o{ LEADS : referenced_in

    PRODUCT_IMAGES ||--|{ PRODUCT_IMAGE_TRANSLATIONS : alt_texts
    PRODUCT_ATTRIBUTE_VALUES ||--o{ PRODUCT_ATTRIBUTE_VALUE_TRANSLATIONS : text_values

    LEADS ||--|{ LEAD_STATUS_HISTORY : tracks
    LEADS ||--|| LEAD_TELEGRAM_DELIVERIES : dispatches
    LEAD_TELEGRAM_DELIVERIES ||--|{ LEAD_DELIVERY_ATTEMPTS : logs

    SITE_SETTINGS {
        string key PK
        enum locale PK
        string value
    }
```

### Спецификация сущностей

#### 1. Категории (`categories`, `category_translations`)

- `id`: `uuid` (Primary Key).
- `parent_id`: `uuid` (Nullable Foreign Key -> `categories.id`, `on delete restrict`).
- `presentation_key`: `enum('fridge', 'stove', 'vacuum', 'generic')`, default `'generic'`.
- `sort_order`: `integer`, >= 0, default `0`.
- `is_published`: `boolean`, default `false`.
- `archived_at`: `timestamptz` (Nullable). При архивации `is_published` принудительно сбрасывается в `false`.
- `image_storage_path`: `text` (Nullable), путь в бакете `category-images`.
- **Переводы (`category_translations`)**: составной PK `(category_id, locale)`.
  - `locale`: `ru` / `ro`.
  - `name`: `text` (1–160 символов).
  - `slug`: `text` (1–180 символов, строгий regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`). Уникален в рамках `(locale, slug)`.
  - `short_description`: `text` (1–280 символов).
  - `description`: `text` (1–5000 символов).
  - `seo_title`: `text` (<= 180 символов, опционально).
  - `seo_description`: `text` (<= 320 символов, опционально).

#### 2. Группы характеристик (`attribute_groups`, `attribute_group_translations`)

- `id`: `uuid` (PK).
- `code`: `text` (1–80 символов, уникален, regex `^[a-z][a-z0-9_]*$`).
- `sort_order`: `integer`, >= 0.
- `is_active`: `boolean`, default `true`.
- **Переводы**: `name` (1–160 символов) для `ru` и `ro`.

#### 3. Характеристики (`attributes`, `attribute_translations`)

- `id`: `uuid` (PK).
- `group_id`: `uuid` (Nullable FK -> `attribute_groups.id`, `on delete restrict`).
- `code`: `text` (1–80 символов, уникален, regex `^[a-z][a-z0-9_]*$`).
- `data_type`: `enum('text', 'number', 'boolean', 'single_select', 'multi_select', 'color')`.
- `unit_code`: `text` (опционально, regex `^[a-z][a-z0-9_]*$`).
- `is_filterable`: `boolean`, default `false`. Запрещено для `data_type = 'text'`.
- `sort_order`: `integer`, >= 0.
- `is_active`: `boolean`, default `true`.
- **Переводы**:
  - `name`: `text` (1–160 символов, обязательно RU/RO).
  - `help_text`: `text` (<= 500 символов, опционально).
  - `unit_label`: `text` (<= 40 символов, опционально).

#### 4. Варианты характеристик (`attribute_options`, `attribute_option_translations`)

- Применимы **только** для типов `single_select` и `multi_select`.
- `id`: `uuid` (PK).
- `attribute_id`: `uuid` (FK -> `attributes.id`, `on delete cascade`).
- `code`: `text` (regex `^[a-z0-9][a-z0-9_]*$`, уникален в рамках характеристики).
- `sort_order`: `integer`, >= 0.
- `is_active`: `boolean`, default `true`.
- **Переводы**: `label` (1–160 символов) для `ru` и `ro`.

#### 5. Привязка характеристики к категории (`category_attributes`)

- Составной PK: `(category_id, attribute_id)`.
- `is_required`: `boolean`, default `false`. Товар не может быть опубликован без заполненной обязательной характеристики.
- `is_filterable`: `boolean` (Nullable override).
- `sort_order`: `integer`, >= 0.

#### 6. Товары (`products`, `product_translations`)

- `id`: `uuid` (PK).
- `category_id`: `uuid` (FK -> `categories.id`, `on delete restrict`).
- `brand`: `text` (1–120 символов).
- `model`: `text` (1–160 символов).
- `sku`: `text` (1–80 символов, глобально уникален).
- `price_minor`: `bigint`, >= 0 (цена в копейках/банях).
- `old_price_minor`: `bigint` (Nullable, обязан быть строго `> price_minor`).
- `currency`: `'MDL'` (константа).
- `availability`: `enum('in_stock', 'out_of_stock', 'on_order')`.
- `quantity`: `integer` (Nullable, >= 0).
- `is_popular`: `boolean`, default `false`.
- `is_new`: `boolean`, default `false`.
- `is_published`: `boolean`, default `false`.
- `sort_order`: `integer`, >= 0.
- `archived_at`: `timestamptz` (Nullable).
- **Переводы (`product_translations`)**:
  - `name`: `text` (1–240 символов).
  - `slug`: `text` (1–220 символов, regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`).
  - `short_description`: `text` (1–500 символов).
  - `description`: `text` (1–10 000 символов).
  - `seo_title`: `text` (<= 180 символов).
  - `seo_description`: `text` (<= 320 символов).

#### 7. Изображения товаров (`product_images`, `product_image_translations`)

- `id`: `uuid` (PK).
- `product_id`: `uuid` (FK -> `products.id`, `on delete cascade`).
- `storage_path`: `text` (уникален, формат `<product_uuid>/<random_uuid>.<ext>`).
- `sort_order`: `integer`, >= 0.
- `is_primary`: `boolean`. Ровно одно главное изображение на товар (частичный уникальный индекс).
- `deletion_pending_at`: `timestamptz` (маркер начала двухфазного удаления).
- **Переводы**: `alt_text` (1–240 символов, обязательно RU и RO для каждого изображения).

#### 8. Значения характеристик товара (`product_attribute_values`, translations)

- Ровно одно заполненное поле значения в строке:
  - `text_value_key` + строки в `product_attribute_value_translations` (до 500 символов RU/RO).
  - `number_value`: `numeric(18, 4)`.
  - `boolean_value`: `boolean`.
  - `option_id`: `uuid` (FK -> `attribute_options.id`).
  - `color_value`: `text` (regex `^#[0-9A-Fa-f]{6}$`).
- `ordinal`: для `multi_select` `ordinal >= 0`, для остальных типов строго `0`.

#### 9. Заявки покупателей (`leads`, `lead_status_history`, `lead_telegram_deliveries`, `lead_delivery_attempts`)

- **`leads`**:
  - `id`: `uuid` (PK).
  - `status`: `enum('new', 'in_progress', 'contacted', 'closed', 'spam')`.
  - `locale`: `ru` / `ro`.
  - `source`: `enum('home_contact', 'contacts_page', 'home_product_card', 'catalog_product_card', 'category_product_card', 'product_page', 'similar_product_card')`.
  - `source_path`: `text` (3–500 символов).
  - `name`: `text` (2–100 символов).
  - `phone`: `text` (regex `^\+?[0-9]{7,15}$`).
  - `telegram_username`: `text` (Nullable, regex `^@[A-Za-z0-9_]{5,32}$`).
  - `comment`: `text` (Nullable, 1–2000 символов).
  - `consent_at`: `timestamptz`.
  - `consent_version`: `text`.
  - **Иммутабельный снимок товара**: `product_id`, `product_name_snapshot`, `product_price_minor`, `product_currency`, `product_path_snapshot`.
- **`lead_status_history`**: фиксирует все переходы статусов с указанием `changed_by` (UUID администратора).
- **`lead_telegram_deliveries`**:
  - `state`: `enum('queued', 'processing', 'retry_wait', 'succeeded', 'permanent_failure', 'manual_review')`.
  - `attempt_count`: 0–3.
  - `delivered_at`: `timestamptz`.
  - `provider_message_id`: `text`.
  - `last_error_code`: `text`.
- **`lead_delivery_attempts`**: подробный лог каждой попытки отправки (HTTP-статус Telegram API, код ошибки, время).

#### 10. Публичные настройки (`site_settings`)

- Составной PK: `(key, locale)`.
- Whitelist ключей:
  - `phone_display`: отображаемый номер телефона.
  - `phone_href`: ссылка вида `tel:+373...`.
  - `address`: физический адрес магазина.
  - `open_days`: рабочие дни.
  - `open_time`: часы работы.
  - `closed_day`: информация о выходных днях.
  - `contact_text`: текст призыва к действию.
- Длина значения: 1–1000 символов.

---

## 6. Detailed Pages Analysis

### 6.1. `/admin/login` (Страница входа)

- **URL**: `/admin/login`
- **Назначение**: Аутентификация администратора.
- **Доступные действия**: Ввод email и пароля, переход по параметру `next`.
- **Поля формы**: `email` (type="email", max 254), `password` (type="password", min 8, max 256), `next` (hidden).
- **Поведение**:
  - При отсутствии конфигурации Supabase выводит предупреждение: «Supabase Auth не настроен...».
  - При ошибке выводит: «Вход не выполнен. Проверьте данные и наличие активной роли администратора.».
  - При успехе перенаправляет на `next` (по умолчанию `/admin`).

### 6.2. `/admin` (Панель управления / Обзор)

- **URL**: `/admin`
- **Назначение**: Экспресс-мониторинг ключевых метрик магазина.
- **Виджеты / Карточки**:
  1. «Всего товаров» -> ссылка на `/admin/products`.
  2. «Опубликовано» -> ссылка на `/admin/products?publication=published`.
  3. «Нет в наличии» -> ссылка на `/admin/products` с товарами `out_of_stock`.
  4. «Категории» -> ссылка на `/admin/categories`.
  5. «Новые заявки» -> ссылка на `/admin/leads?status=new`.
  6. «Ошибки Telegram» -> ссылка на `/admin/leads` (доставки в статусах `permanent_failure` / `manual_review`).
- **Секция «Последние заявки»**: 5 самых свежих заявок с бейджем статуса и ссылкой на подробную страницу `/admin/leads/[id]`.

### 6.3. `/admin/categories` (Список категорий)

- **URL**: `/admin/categories`
- **Назначение**: Просмотр реестра категорий каталога.
- **Действия**: Кнопка «Добавить категорию» -> `/admin/categories/new`. Клик по карточке категории -> переход в карточку редактирования.
- **Отображаемые данные**: Название RU, название RO (или warning «RO не заполнен»), presentation key, бейдж статуса (Опубликована [success], Черновик [warning], Архив [danger]), счетчик активных товаров.

### 6.4. `/admin/categories/new` и `/admin/categories/[id]` (Карточка категории)

- **URL**: `/admin/categories/new`, `/admin/categories/[id]`
- **Доступные действия**:
  - Создание / редактирование категории (атомарно с обоими переводами).
  - Загрузка изображения категории (только на `[id]`).
  - Архивирование / восстановление категории (только на `[id]`).
- **Поля формы**:
  - `parent_id` (select): список доступных неархивных категорий без возможности выбрать саму себя.
  - `presentation_key` (select): `generic`, `fridge`, `stove`, `vacuum`.
  - `sort_order` (integer input, >= 0).
  - `is_published` (checkbox).
  - Блок RU: `ru_name` (1–240), `ru_slug` (1–220, regex), `ru_short_description` (1–500), `ru_description` (1–5000), `ru_seo_title` (<= 70), `ru_seo_description` (<= 160).
  - Блок RO: аналогичный набор полей для румынского языка.
- **Секция изображения (`[id]`)**:
  - Предпросмотр текущего изображения.
  - Поле выбора файла (`image/jpeg,image/png,image/webp,image/avif`).
  - Кнопка «Загрузить изображение». При замене старый файл в Storage автоматически удаляется.
- **Секция архивации (`[id]`)**:
  - Кнопка с подтверждением (Confirm Dialog): «Архивировать категорию?» или «Восстановить категорию как черновик?».
  - Блокируется базой данных, если в категории есть активные товары или подкатегории (`category_in_use`).

### 6.5. `/admin/attribute-groups` и `/admin/attribute-groups/[id]` (Группы характеристик)

- **URL**: `/admin/attribute-groups`, `/admin/attribute-groups/new`, `/admin/attribute-groups/[id]`
- **Поля**: `code` (regex `^[a-z][a-z0-9_]*$`), `sort_order` (int), `name_ru` (1–160), `name_ro` (1–160), `is_active` (checkbox).
- **Удаление**: Кнопка «Удалить группу» с подтверждением. Удаление разрешено **только для пустых групп**. Если в группе есть характеристики, возвращается ошибка `attribute_group_in_use`.

### 6.6. `/admin/attributes` и `/admin/attributes/[id]` (Характеристики)

- **URL**: `/admin/attributes`, `/admin/attributes/new`, `/admin/attributes/[id]`
- **Поля характеристик**: `code`, `group_id` (select), `data_type` (select: `text`, `number`, `boolean`, `single_select`, `multi_select`, `color`), `unit_code`, `sort_order`, `is_active`, `is_filterable`, переводы RU/RO (`name`, `help`, `unit`).
- **Секция «Варианты» (`[id]`)**:
  - Отображается только для `single_select` и `multi_select`.
  - Форма добавления/редактирования варианта: `code`, `sort_order`, `label_ru`, `label_ro`, `is_active`.
  - Удаление варианта: блокируется, если вариант выбран хотя бы в одном товаре (`attribute_option_in_use`).
- **Секция «Категории» (`[id]`)**:
  - Список уже привязанных категорий с индивидуальными настройками: `is_required` (Обязательная), `is_filterable` (Фильтр, заблокирован для text), `sort_order` (Порядок), кнопка «Отвязать».
  - Форма «Добавить категорию» для непривязанных категорий.
  - Отвязка блокируется базой, если у товаров этой категории заполнены значения данной характеристики (`category_attribute_in_use`).
- **Секция «Удаление характеристики»**:
  - Удаление блокируется, если характеристика привязана к категориям или заполнена в товарах (`attribute_in_use`).

### 6.7. `/admin/products` (Список товаров)

- **URL**: `/admin/products`
- **Параметры фильтрации**:
  - `q`: поиск по названию RU/RO, бренду, модели или SKU.
  - `category`: фильтр по категории.
  - `publication`: `published`, `draft`, `archived`.
- **Лимит выборки**: до 250 последних обновленных товаров (`updated_at desc`).

### 6.8. `/admin/products/[id]` (Редактор товара)

- **URL**: `/admin/products/[id]`
- **Секция «Статус и Чеклист публикации»**:
  - Бейдж статуса: Опубликован / Черновик / Архив.
  - Кнопки: «Preview RU», «Preview RO», а также «Витрина RU» и «Витрина RO» (только для опубликованных).
  - Интерактивный чеклист:
    1. Категория опубликована и не архивирована (`✓` / `×`).
    2. Переводы RU и RO заполнены (`✓` / `×`).
    3. Обязательные характеристики заполнены (`✓` / `×`).
    4. Alt-тексты всех существующих изображений заполнены на обоих языках (`✓` / `×`).
- **Форма основных данных**:
  - `category_id`, `brand` (1–120), `model` (1–160), `sku` (1–80, unique), `price` (MDL строка), `old_price` (MDL строка, strictly > price), `availability` (`in_stock`, `out_of_stock`, `on_order`), `quantity` (int >= 0), `sort_order` (int >= 0), `is_new`, `is_published`.
  - Переводы RU и RO (`name`, `slug`, `short_description`, `description` до 10 000 символов, `seo_title`, `seo_description`).
- **Форма характеристик (`ProductAttributesForm`)**:
  - Динамически генерируется на основе привязок выбранной категории.
  - Поля: Text (RU/RO), Number, Boolean (Да/Нет/Не задано), Single Select (выпадающий список активных вариантов), Multi Select (чекбоксы активных вариантов), Color (`#RRGGBB`).
- **Форма изображений (`uploadProductImageAction`)**:
  - Загрузка файла (до 5 МБ), поля `alt_ru` и `alt_ro`, `sort_order`, чекбокс `is_primary`.
  - Список загруженных фото с возможностью редактирования Alt/Порядка/Главного и безопасного удаления.
- **Секция архивации**:
  - Архивирование / Восстановление товара.

### 6.9. `/admin/products/[id]/preview/[locale]` (Предпросмотр товара)

- **URL**: `/admin/products/[id]/preview/ru` и `/admin/products/[id]/preview/ro`
- **Назначение**: Защищенный рендеринг карточки черновика или опубликованного товара с характеристиками и описанием на выбранном языке без публикации в открытый интернет.

### 6.10. `/admin/leads` (Журнал заявок)

- **URL**: `/admin/leads`
- **Фильтры**:
  - `q`: имя или телефон.
  - `status`: `new`, `in_progress`, `contacted`, `closed`, `spam`.
  - `source`: 7 кодов источников (`home_contact`, `product_page`, etc.).
  - `locale`: `ru` / `ro`.
  - `product`: выбор конкретного товара.
  - `date_from`, `date_to`: фильтрация по диапазону дат.
- **Действия**: Кнопка «Применить», кнопка «Экспорт CSV».

### 6.11. `/admin/leads/[id]` (Карточка заявки)

- **URL**: `/admin/leads/[id]`
- **Секции**:
  1. **Контактные данные (иммутабельные)**: Телефон (клик `tel:`), Telegram, комментарий, источник, URL-путь, язык, дата согласия.
  2. **Snapshot товара (иммутабельный)**: Название, цена в MDL на момент создания заявки, ссылка на товар при заявке, ссылка на актуальный товар в админке.
  3. **Статус и история**: Выпадающий список выбора статуса (`new` -> `in_progress` -> `contacted` -> `closed` / `spam`) и хронологический таймлайн изменений с UUID администратора.
  4. **Telegram Delivery**: Текущее состояние доставки, число попыток, message ID, код последней ошибки, детальный лог попыток с HTTP-кодами.
  5. **Повтор отправки в Telegram**: При статусе `manual_review` отображается обязательный чекбокс: «Понимаю риск дубликата: предыдущая попытка могла быть принята Telegram».

### 6.12. `/admin/settings` (Публичные настройки)

- **URL**: `/admin/settings`
- **Назначение**: Редактирование 7 разрешенных пар публичных настроек RU/RO.
- **Ключи**: `phone_display`, `phone_href`, `address`, `open_days`, `open_time`, `closed_day`, `contact_text`.
- **Поведение**: Каждая настройка сохраняется индивидуальной кнопкой «Сохранить настройку», обновляя одновременно русский и румынский тексты.

### 6.13. `/admin/media/orphans` (Проверка файлов)

- **URL**: `/admin/media/orphans`
- **Назначение**: Выявление и устранение рассинхронизации между Storage бакетом `product-images` и таблицей `product_images`.
- **Состояния**:
  - `orphan_object`: файл физически есть в Storage, но записи в БД нет -> действие «Очистить» (удаление файла).
  - `missing_object`: в БД есть запись, но файл в Storage отсутствует -> действие «Очистить» (удаление сломанной метадаты).
  - `pending_metadata`: операция удаления оборвалась на полпути -> действие «Восстановить / завершить» (проверка фактического наличия файла и финализация).

---

## 7. Business Workflows

### 7.1. Жизненный цикл товара

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Администратор
    participant UI as Admin UI
    participant Action as Server Action
    participant RPC as PostgreSQL RPC
    participant DB as Database
    participant Storage as Supabase Storage

    Admin->>UI: Создание товара (Черновик)
    UI->>Action: saveProductAction (is_published=false)
    Action->>RPC: admin_save_product
    RPC->>DB: INSERT into products & product_translations
    DB-->>UI: Товар создан (ID)

    Admin->>UI: Заполнение характеристик
    UI->>Action: saveProductAttributesAction
    Action->>RPC: admin_replace_product_attribute_values
    RPC->>DB: DELETE old & INSERT new validated values

    Admin->>UI: Загрузка изображения
    UI->>Action: uploadProductImageAction (file, alt_ru, alt_ro)
    Action->>Storage: upload(productId/uuid.ext)
    Action->>RPC: admin_create_product_image
    RPC->>DB: INSERT product_images & translations

    Admin->>UI: Проверка Preview RU / Preview RO
    UI-->>Admin: Рендеринг карточки без публичного доступа

    Admin->>UI: Включение флага «Опубликован»
    UI->>Action: saveProductAction (is_published=true)
    Action->>RPC: admin_save_product
    Note over RPC,DB: Проверка Deferred Constraints (категория, переводы, обязательные атрибуты, alt-тексты)
    DB-->>UI: Товар опубликован
```

### 7.2. Обработка заявки и Telegram delivery

```mermaid
stateDiagram-v2
    [*] --> new: Публичная заявка
    new --> in_progress: Администратор берет в работу
    in_progress --> contacted: Связались с клиентом
    contacted --> closed: Успешно завершена
    new --> spam: Спам
    in_progress --> spam: Спам

    state TelegramDelivery {
        queued --> processing: Воркер/Сервер
        processing --> succeeded: 200 OK
        processing --> retry_wait: 429 Too Many Requests
        retry_wait --> processing: Auto Retry
        processing --> permanent_failure: 400 / 401 / 404 (Config Error)
        processing --> manual_review: Timeout / Network Failure
        manual_review --> processing: Ручной Retry админа (с чекбоксом риска)
        permanent_failure --> processing: Ручной Retry админа
    }
```

---

## 8. Existing Tests & Coverage Matrix

### 8.1. Существующие юнит-тесты (`tests/*.test.ts`)

1. **`tests/admin-actions.test.ts`**: Проверка авторизационных гардов перед мутацией, инвалидации тегов кэша после успеха, отсутствия мутаций при сбое авторизации.
2. **`tests/admin-validation.test.ts`**: Валидация типов полей, slug regex, code regex, целочисленных полей, конвертации цен в `minor units` и обратно, валидация изображений (размер, magic bytes).
3. **`tests/admin-errors.test.ts`**: Санитизация ошибок PostgreSQL и мэппинг в понятные пользовательские тексты.
4. **`tests/admin-money.test.ts`**: Граничные случаи строковой арифметики денег, парсинг запятых и точек, предотвращение переполнения `bigint`.
5. **`tests/admin-storage.test.ts`**: Проверка генерации путей изображений, структуры бакета.
6. **`tests/admin-mapper.test.ts`**: Преобразование строк БД в DTO панели управления.
7. **Тесты каталога и заявок**: `leads-delivery.test.ts`, `leads-validation.test.ts`, `leads-security.test.ts`, `leads-privacy.test.ts`, `catalog-logic.test.ts`, `catalog-query.test.ts`.

### 8.2. Интеграционный тест (`tests/integration/stage-6-admin.test.ts`)

- Проверяет полный цикл взаимодействия с реальным локальным Supabase:
  - Создание пользователей (Admin, Non-Admin, Inactive).
  - Проверка запрета доступа для Non-Admin и Inactive.
  - Создание категории -> создание группы -> создание обязательной характеристики -> привязка к категории.
  - Создание черновика товара -> заполнение характеристики -> загрузка фото -> публикация.
  - Проверка публичной витрины и ревалидации.
  - Смена slug и проверка постоянного 308 редиректа.
  - Смена статуса лида и фиксация в истории.
  - Редактирование публичных настроек.
  - Двухфазное удаление фото и архивация сущностей.
  - Очистка тестовых данных.

### 8.3. Playwright E2E тесты (`e2e/*.spec.ts`)

- **`e2e/admin-navigation-styles.spec.ts`**: Проверяет исключительно цвет CSS-ссылки активного раздела меню на странице `/admin/login`.
- **Остальные e2e тесты**: `assistant-widget.spec.ts`, `catalog-filters.spec.ts`, `contacts-legal-form.spec.ts`, `mobile-layout.spec.ts`, `public-shell.spec.ts` — тестируют публичный сайт.
- **Пробел в E2E**: Ни один сценарий админки (вход, создание сущностей, валидация, редактирование, удаление, фильтрация, экспорт) в Playwright E2E еще не автоматизирован.

---

## 9. Potential Risk Areas

1. **Потеря несохраненных данных (No Auto-save / Draft recovery)**:
   - В формах категорий, характеристик и товаров отсутствует автосохранение.
   - Случайный клик по навигации или перезагрузка страницы приводит к полной потере введенного текста.
2. **Несовместимость характеристик при смене категории товара**:
   - Если товар имел заполненные характеристики категории А, а администратор меняет категорию на Б (где эти характеристики не привязаны), RPC `admin_save_product` завершится ошибкой `product_category_attributes_incompatible`. Администратор должен сначала вручную очистить старые характеристики.
3. **Риск дубликатов сообщений Telegram (`manual_review`)**:
   - При таймауте сети сервер не знает, дошло ли сообщение до Telegram. Повторная отправка требует ручной сверки с реальным чатом Telegram и взвода специального чекбокса.
4. **Масштабируемость списков без серверной пагинации**:
   - Список товаров жестко ограничен 250 записями (`limit(250)`).
   - Список заявок ограничен 100 записями (`limit(100)`).
   - Сканирование orphan-файлов ограничено 1000 папок по 1000 файлов.
5. **Отсутствие удаления изображения категории без замены**:
   - Изображение категории можно заменить новым файлом, но нельзя удалить «в ноль», оставив категорию без картинки, через текущий UI.
6. **Строгие требования к slug и истории 308 редиректов**:
   - Slug допускает только строчные латинские буквы, цифры и одиночные дефисы.
   - Изменение slug опубликованного товара создает запись в истории с постоянным редиректом. Если ошибиться в новом slug, потребуется еще одно переименование.
7. **Отсутствие встроенного управления пользователями**:
   - В админ-панели нет экранов добавления администраторов или сброса паролей. Управление учетными записями осуществляется только через Supabase Dashboard владельцем проекта.

---

## 10. Candidate E2E Scenarios (Playwright)

### P0 (Критический приоритет)

#### Scenario 1: Полный цикл аутентификации и авторизации

- **Reason**: Гарантия безопасности backoffice и предотвращение несанкционированного доступа.
- **Preconditions**: В базе настроен активный пользователь с ролью `admin` и обычный пользователь без роли.
- **Actions**:
  1. Попытка открыть `/admin` без cookies -> Ожидается редирект на `/admin/login?next=%2Fadmin`.
  2. Ввод неверного пароля -> Проверка отображения сообщения об ошибке.
  3. Вход под пользователем без роли `admin` -> Проверка запрета входа.
  4. Вход с корректными credentials администратора -> Успешный вход и открытие `/admin`.
  5. Проверка отображения email администратора в шапке.
  6. Нажатие кнопки «Выйти» -> Завершение сессии и возврат на `/admin/login`.
- **Required test data**: Admin user credentials, Non-admin user credentials.

#### Scenario 2: Создание, публикация и архивация категории

- **Reason**: Базовый строительный блок каталога.
- **Preconditions**: Администратор авторизован.
- **Actions**:
  1. Переход в `/admin/categories/new`.
  2. Заполнение полей: родитель, `presentation_key = generic`, `sort_order`, RU/RO названия, слаги, описания.
  3. Сохранение черновика -> Переход на `/admin/categories/[id]?saved=1`.
  4. Загрузка валидного изображения категории (JPEG/WebP).
  5. Включение флага «Опубликована» и сохранение.
  6. Проверка появления категории в списке `/admin/categories`.
  7. Архивирование категории через кнопку с подтверждением.
  8. Проверка изменения статуса на «Архив».
- **Required test data**: Уникальный slug, валидный тестовый файл изображения.

#### Scenario 3: Конструктор характеристик и привязка к категориям

- **Reason**: Управление типами данных, опциями и валидацией товаров.
- **Preconditions**: Существует тестовая категория.
- **Actions**:
  1. Создание группы характеристик `/admin/attribute-groups/new`.
  2. Создание характеристики типа `single_select` с привязкой к созданной группе.
  3. Добавление двух вариантов выбора (Options) с RU/RO labels.
  4. Привязка характеристики к тестовой категории с флагами `is_required = true` и `is_filterable = true`.
  5. Проверка сохранения привязки.
- **Required test data**: Тестовая категория, уникальные коды характеристик и вариантов.

#### Scenario 4: Полный жизненный цикл товара

- **Reason**: Основной коммерческий сценарий интернет-магазина.
- **Preconditions**: Создана опубликованная категория с привязанной обязательной характеристикой.
- **Actions**:
  1. Создание товара-черновика `/admin/products/new` (бренд, модель, уникальный SKU, цена в MDL, RU/RO описания).
  2. Проверка чеклиста публикации (должен показывать незаполненные обязательные характеристики).
  3. Заполнение обязательной характеристики в блоке «Характеристики».
  4. Загрузка главного изображения с Alt RU и Alt RO.
  5. Открытие «Preview RU» и «Preview RO» -> Проверка отображения цен, параметров и текстов.
  6. Включение флага «Опубликован» -> Сохранение.
  7. Проверка доступности ссылок «Витрина RU» и «Витрина RO».
  8. Смена статуса наличия на «Нет в наличии» (`out_of_stock`).
  9. Архивирование товара.
- **Required test data**: Тестовая категория, SKU, тестовое изображение.

#### Scenario 5: Обработка заявки покупателя и история статусов

- **Reason**: Главная бизнес-цель платформы — сбор и обработка лидов.
- **Preconditions**: В базе создана заявка со статусом `new`.
- **Actions**:
  1. Открытие `/admin/leads?status=new`.
  2. Поиск заявки по телефону.
  3. Открытие карточки `/admin/leads/[id]`.
  4. Проверка отображения контактов и иммутабельного снимка товара.
  5. Последовательный перевод статуса: `new` -> `in_progress` -> `contacted` -> `closed`.
  6. Проверка фиксации каждого шага в блоке «История статусов».
  7. Проверка блока «Telegram delivery» и возможности повторной отправки.
  8. Экспорт CSV на `/admin/leads` и проверка структуры файла.
- **Required test data**: Заявка в БД с привязкой к товару.

---

### P1 (Высокий приоритет)

#### Scenario 6: Редактирование публичных настроек магазина

- **Reason**: Обеспечение актуальности контактных данных и расписания на витрине.
- **Preconditions**: Авторизованный администратор на странице `/admin/settings`.
- **Actions**:
  1. Изменение телефона отображения `phone_display` RU/RO.
  2. Изменение графика работы `open_time` RU/RO.
  3. Сохранение настройки.
  4. Проверка отображения обновленных данных на публичных страницах `/ru` и `/ro`.

#### Scenario 7: Проверка файлов и устранение расхождений (Media Orphans)

- **Reason**: Предотвращение утечек места в Storage и битых ссылок на изображения.
- **Preconditions**: Страница `/admin/media/orphans`.
- **Actions**:
  1. Загрузка страницы, проверка статуса «Orphan-файлов нет» при согласованном состоянии.
  2. Проверка отображения проблемных записей (`orphan_object`, `missing_object`, `pending_metadata`).
  3. Вызов действия сверки/очистки через кнопку с подтверждением.

#### Scenario 8: Адаптивная навигация и мобильный интерфейс

- **Reason**: Удобство работы контент-менеджера со смартфона и планшета.
- **Actions**:
  1. Эмуляция экрана мобильного устройства (Viewport 375x667).
  2. Открытие меню кнопкой `☰`.
  3. Навигация по всем разделам админки.
  4. Закрытие меню по кнопке `×`, клику на backdrop и клавише `Escape`.

---

### P2 (Средний приоритет)

#### Scenario 9: Граничные случаи валидации форм

- **Reason**: Защита от ввода некорректных данных и проверка сообщений об ошибках.
- **Actions**:
  1. Ввод `old_price <= price` -> Ожидается ошибка валидации.
  2. Ввод цены с буквами или тремя знаками после запятой -> Ожидается блокировка.
  3. Ввод slug с пробелами или кириллицей -> Блокировка HTML5-паттерном и серверной валидацией.
  4. Загрузка файла > 5 МБ или неподдерживаемого формата (.exe, .pdf, .svg) -> Ошибка `upload_invalid`.
  5. Попытка создания товара или категории с уже существующим SKU / slug -> Ошибка уникальности `duplicate key`.

---

## 11. Unknowns & Constraints

1. **Credentials администратора**:
   - В соответствии с правилами безопасности реальные логины и пароли не сохраняются в файлы проекта. При запуске тестов они будут передаваться через переменные окружения (`TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`).
2. **Локальный стек Supabase vs Remote Staging**:
   - Локальный прогон полного набора тестов (`npm run test:integration:local`) требует локально запущенного Docker-стека Supabase (`npm run db:start`).
   - На удаленном окружении Vercel / Remote Supabase проект уже функционирует и содержит предзаполненные данные каталога (15 категорий, 105 товаров).
3. **Хранилище Storage в E2E**:
   - Для полноценного сквозного тестирования загрузки и удаления файлов в E2E потребуется доступный экземпляр Supabase Storage (локальный или тестовый бакет).

---

## 12. Findings & Classification

| Категория     | Наблюдение / Факт                                                                                                           |      Статус / Классификация      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | :------------------------------: |
| **Security**  | Вся административная логика защищена через `SECURITY INVOKER` RPC + RLS, `requireAdmin()` вызывается перед каждым действием |      **Confirmed Behavior**      |
| **Security**  | Формулы в CSV-экспорте (`=`, `+`, `-`, `@`) экранируются апострофом для защиты от CSV Formula Injection                     |      **Confirmed Behavior**      |
| **Integrity** | Нельзя опубликовать товар без опубликованной категории, переводов RU/RO, обязательных характеристик и alt-текстов фото      |      **Confirmed Behavior**      |
| **Integrity** | Запрещено менять тип характеристики при наличии значений или опций                                                          |      **Confirmed Behavior**      |
| **Integrity** | Текстовые характеристики физически заблокированы триггером БД от включения в канонические фильтры каталога                  |      **Confirmed Behavior**      |
| **UI / UX**   | Отсутствует автосохранение черновиков в браузере (Local Draft Cache)                                                        |     **Confirmed Limitation**     |
| **UI / UX**   | Списки товаров и заявок не имеют постраничной пагинации на сервере (фиксированные лимиты 250 и 100 записей)                 |   **Known Operational Limit**    |
| **Testing**   | Полное отсутствие E2E тестов административных сценариев в папке `e2e/` (покрыта только витрина)                             | **Confirmed Gap for Next Stage** |

## 13. Live Browser Reconnaissance Results (Chromium Session)

Динамическое исследование через браузер подтвердило корректную работу и доступность всех разделов:

1. **Аутентификация (`/admin/login`)**:
   - Авторизация через форму проходит успешно, HTTP 303 Redirect на `/admin` с установкой SSR Auth cookies.
2. **Панель управления (`/admin`)**:
   - «Всего товаров»: **105**
   - «Опубликовано»: **105**
   - «Нет в наличии»: **0**
   - «Категории»: **15**
   - «Новые заявки»: **0**
   - «Ошибки Telegram»: **0**
3. **Категории (`/admin/categories`)**:
   - Отображается 15 активных опубликованных категорий (в каждой по 7 товаров).
   - Форма `/admin/categories/[id]` корректно отображает RU/RO названия, слаги, presentation key (`fridge`, `stove`, `generic`), секцию загрузки изображений и блок архивации.
   - Форма создания `/admin/categories/new` содержит 18 полей ввода.
4. **Группы характеристик (`/admin/attribute-groups`)**:
   - Найдено 2 группы («Основные характеристики», «Экран»).
5. **Характеристики (`/admin/attributes`)**:
   - Найдено 4 характеристики. Исследован атрибут `energy_class` (`single_select`, 2 варианта выбора, привязан ко всем 15 категориям).
6. **Товары (`/admin/products`)**:
   - В реестре загружено 105 товаров.
   - Исследована карточка `Nivona CafeRomatica 520` (SKU `TS-COF-0055`, цена `8299 MDL`). Чеклист публикации полностью пройден (`✓` по всем 4 пунктам).
   - Защищенный предпросмотр `/admin/products/[id]/preview/ru` открывается со статусом `200 OK` и корректным рендерингом карточки.
7. **Заявки (`/admin/leads`)**:
   - Фильтры по статусам, источникам, языкам и датам активны. Кнопка «Экспорт CSV» доступна.
8. **Публичные настройки (`/admin/settings`)**:
   - Доступны все 7 настроек: `phone_display`, `phone_href`, `address`, `open_days`, `open_time`, `closed_day`, `contact_text`.
9. **Проверка файлов (`/admin/media/orphans`)**:
   - Статус: _«Orphan-файлов нет. Storage и metadata согласованы.»_
10. **Завершение сессии (Logout)**:
    - Кнопка «Выйти» корректно сбрасывает сессию и перенаправляет на `/admin/login`.

## 14. Local Test Environment & Authentication Verification

### 14.1. Local Test Environment

- **Запуск локального приложения**:
  - Локальный стек запускается через `npm run dev` на порту `http://localhost:3000`.
  - Переменные окружения конфигурируются в `.env.local` (файл в `.gitignore`), перенаправляя вызовы к локальному API Supabase.
- **Используемая Test / Local Database**:
  - Локальный контейнеризованный стек Supabase (`supabase_db_sklad`, PostgreSQL 15+).
  - API Gateway / PostgREST / GoTrue Auth: `http://127.0.0.1:54321`.
  - Прямое подключение к базе данных: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
  - Инициализация и накат миграций со сидом: `npm run db:reset:local`.
- **Создание Test Admin**:
  - Создание реального пользователя в Supabase GoTrue Auth через Admin API (`service.auth.admin.createUser({ email, password, email_confirm: true })`).
  - Создание активного профиля в таблице `public.profiles` (`is_active = true`, `display_name = 'Local E2E Administrator'`).
  - Привязка роли администратора в таблице `public.user_roles` (`role = 'admin'`).
  - Учетные данные передаются строго через переменные окружения `TEST_ADMIN_EMAIL` и `TEST_ADMIN_PASSWORD` (в коде и markdown пароли не сохраняются).
- **Роли и Permissions**:
  - Роль `admin` из enum `public.app_role`.
  - Доступ проверяется функцией `private.is_admin()`, возвращающей `true` только для активных профилей с ролью `admin`.
- **Механизм аутентификации**:
  - Аутентификация выполняется через стандартную форму входа `/admin/login` (Server Action `signInAdmin`), использующую `@supabase/ssr` для установки безопасных сессионных HTTP-only cookies.
  - Никаких фиктивных флагов или обходов авторизации не используется: тестовый пользователь проходит полный боевой путь аутентификации и RLS-проверок.
- **Внесенные изменения для локального reconnaissance**:
  - `.env.local` переключен на локальный стек (`http://127.0.0.1:54321`).
  - В `supabase/seed.sql` устранены 4 невалидных слага с недопустимыми символами (`kärcher-vc-3` -> `karcher-vc-3`, `russell hobbs-23330-56` -> `russell-hobbs-23330-56`, `cooper&hunter-ch-s09ftxla` -> `cooper-hunter-ch-s09ftxla`, `mitsubishi heavy-srk20zsp-s` -> `mitsubishi-heavy-srk20zsp-s`), нарушавших строгий check constraint `product_translations_slug_check`.

---

### 14.2. Authentication Verification

- [x] **Test Admin создан**: Пользователь с тестовым email (`admin.e2e@test.local`) зарегистрирован в локальной Auth GoTrue, профиль активирован, роль `admin` присвоена.
- [x] **Login через UI выполнен**: Playwright в headless Chromium перешел на `http://localhost:3000/admin/login`, заполнил форму и нажал кнопку «Войти».
- [x] **Authentication verified**: Сервер вернул HTTP 303 Redirect на `/admin`, сессионные cookies записаны в браузер.
- [x] **Authorization verified**: Функция `private.is_admin()` подтвердила права администратора под RLS, доступ к Server Actions и RPC открыт.
- [x] **Admin panel доступна**: Панель управления `/admin` успешно загрузилась (HTTP 200), в шапке отобразился email администратора, все 8 разделов и формы открываются без ошибок.

---

_Отчет сформирован по результатам статического и динамического анализа кодовой базы, схемы БД, API, локального стека и браузерного исследования._

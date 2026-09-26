# Этап 7 — grounded AI-ассистент каталога

## Результат

Добавлен публичный RU/RO виджет и `POST /api/assistant`. Браузер передаёт только locale, вопрос и не более шести коротких реплик; история остаётся в памяти вкладки, передаётся provider для понимания уточнений и не пишется в БД/localStorage. Endpoint проверяет same-origin, JSON, 8 KiB body, whitelist полей/ролей и `Cache-Control: no-store`.

## Grounding и provider boundary

`AssistantProvider` изолирует внешний adapter. Сейчас поддерживаются `fallback` (default, без сети) и `openai-compatible` adapter с server-only `AI_PROVIDER_BASE_URL`; автоматические тесты используют только deterministic fallback и никогда не вызывают provider. Перед provider сервер через публичный RLS-safe catalog repository выполняет bounded search (5 published products), allowlist-ит ID, localized name/category/brand/model/price/stock/specifications и canonical local URL. Каталог читается только публичным RLS-клиентом, tables leads/outbox не используются; service-role нужен ровно в трёх местах — RPC лимита частоты, запись `assistant_logs` и чтение `assistant_knowledge` (см. `docs/security.md`).

Адрес, телефон, график и опубликованные юридические реквизиты обрабатываются детерминированно из public site settings и legal environment без обращения к AI. Для остальных вопросов provider получает общий grounding из публичных настроек, релевантных активных записей `assistant_knowledge`, публичных юридических документов и authoritative catalog DTO. История используется только как разговорный контекст и не считается источником фактов.

Ответ provider — strict JSON; HTML, links и price tokens убираются. Ссылки, карточки, цены и availability UI собирает исключительно из authoritative DTO. При отсутствии ключа, timeout, 429/5xx или malformed response fallback возвращает релевантную подтверждённую статью, результаты deterministic catalog search либо безопасно предлагает связаться с магазином по номеру из public settings.

## Threat model

System instruction запрещает disclosure/role changes/admin operations/sensitive data и считает catalog text untrusted. Пользователь не может передать system prompt, model, tools or provider options. Нет PII leads в prompt; raw IP не сохраняется и не логируется. Лог: random request ID, outcome category, provider category, duration bucket, fallback flag and reference count only. Existing CSP is not changed.

## Rate limit и secrets

Migration создаёт закрытую `private.assistant_rate_limits` и узкий `SECURITY DEFINER` RPC, который принимает только HMAC-SHA256 subject hash. RPC исполняется только service-role клиентом server endpoint и не доступен через publishable Data API key. Лимит: 8 запросов/минуту. Нужен отдельный `AI_RATE_LIMIT_SECRET` (>=32 chars), не `LEAD_IP_HASH_SECRET`. `AI_PROVIDER`, `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_MS` server-only; no key is bundled.

`assistant_logs` хранит только UUID запроса, locale, outcome/provider, duration bucket, fallback и число references — без IP, prompt, истории или PII. Эти записи видны администратору на `/admin/assistant-logs`: сводка за 7/30/90 дней и последние запросы читаются обычным RLS-клиентом админки (политика `admin_all`), service-role для чтения не используется.

`assistant_knowledge` — RLS-защищённая двуязычная база знаний с полноценным admin workflow: RPC `admin_save_assistant_knowledge` / `admin_delete_assistant_knowledge` (миграция `20260915091000_assistant_knowledge_admin.sql`), экран `/admin/assistant-knowledge` и стартовые статьи RU/RO в `supabase/seed.sql`. Запись идёт через `admin_*` RPC под RLS, как остальной admin CRUD. Чтение статей помощником выполняется service-role клиентом (публичному виджету admin-политика недоступна), поэтому фильтр `is_active` применяется в коде запроса, а не базой.

## Known limitations

Поиск каталога токенный: `private.catalog_search_matches` (миграция `20260915090000_catalog_search_tokens.sql`) и его TypeScript-зеркало `src/features/catalog/search-text.ts` сопоставляют префиксы токенов по локализованным названию, бренду, модели, SKU и названию категории. Поэтому вопрос «какие холодильники есть в наличии» находит товары, хотя ни один товар не называется «холодильник» — совпадение идёт по названию категории. Категория, бренд, наличие, ценовой диапазон и сортировка извлекаются слоем `src/features/assistant/retrieval.ts`, который наследует контекст для уточняющих вопросов и ослабляет слишком узкий запрос по ограниченной лестнице.

Остаётся ограничение: характеристики в свободной форме («на сколько килограмм загрузка») не превращаются в фильтр по `product_attribute_values` — такой запрос уходит в общий поиск по категории. Истории разговоров и биллинга провайдера нет.

Телеметрия `assistant_logs` пишется только при настроенном service-role ключе. В demo-режиме и локально она остаётся в консоли сервера, поэтому `/admin/assistant-logs` там будет пустым — это ожидаемо, а не сбой.

Перед production задать `AI_RATE_LIMIT_SECRET`; для внешнего AI также provider/key/model, review provider data-processing terms и cost caps. Production endpoint URLs must use HTTPS.

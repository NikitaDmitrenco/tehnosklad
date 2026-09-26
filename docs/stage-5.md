# Этап 5 — заявки и Telegram

Дата завершения: 5 августа 2026 года.

## Результат

Диалог связи больше не является демонстрацией: RU/RO форма отправляет заявку в `POST /api/leads`, сервер валидирует и нормализует данные, сохраняет их в Supabase и только после commit обрабатывает Telegram outbox. Успешный HTTP-ответ означает, что заявка уже находится в БД; недоступность Telegram не приводит к потере формы.

Контекст источника различает главную, контакты, карточки home/catalog/category/similar и product page. Для товарной заявки браузер передаёт UUID, а сервер сохраняет локализованные имя, цену, валюту и canonical path из опубликованного каталога.

## HTTP-контракт

`POST /api/leads` принимает `application/json` до 16 KiB со strict same-origin `Origin` и UUID в `Idempotency-Key`.

Поля формы:

- `name`, `phone`, optional `telegram`, optional `comment`;
- обязательное `consent=true`;
- `locale`, `source`, `sourcePath`;
- optional `productId`;
- `companyWebsite` — off-screen honeypot.

Основные ответы: `201` для новой сохранённой заявки, `200` для точного idempotent replay, `202` для honeypot, `400/403/413/415/422` для неверного запроса, `409` при повторном UUID с другим canonical payload, `429` с `Retry-After: 900`, `503` при недоступном хранилище/конфигурации.

Форма сохраняет введённые значения при ошибке. Один и тот же idempotency key повторно используется после неоднозначной сетевой ошибки; после явного ответа с ошибкой пользователь может исправить данные и отправить новый запрос.

## Модель данных

Migration `20260805213000_stage_5_leads_telegram.sql` добавляет:

- `leads` — immutable contact/consent/source/product snapshot и изменяемый status;
- `lead_status_history` — initial и последующие переходы статуса;
- `lead_telegram_deliveries` — одна durable outbox-запись на lead;
- `lead_delivery_attempts` — отдельный результат каждой claim lease;
- `private.lead_rate_limits` — HMAC buckets без raw IP/phone.

`submit_public_lead` использует advisory locks, поэтому параллельные запросы с одним idempotency key, IP или телефоном сериализуются. Лимиты применяются только к новым заявкам: 5 на IP/15 минут и 3 на телефон/час. Точный replay возвращает существующий UUID до увеличения rate counters.

## Telegram delivery

После commit route handler claims конкретную заявку, затем может забрать ещё одну due delivery. Bot API получает HTML-safe сообщение с временем Europe/Chisinau, контактом, комментарием, источником, lead UUID и authoritative product URL.

Классификация исходов:

- `succeeded` — Telegram вернул `ok=true` и message id;
- `retryable_failure` — только явный HTTP/Telegram `429`, до 3 attempts;
- `permanent_failure` — неверная/отсутствующая конфигурация, отклонённый `4xx` или исчерпанные attempts;
- `uncertain_failure`/`manual_review` — timeout/network, `5xx`, некорректный success response или stale processing lease.

Telegram Bot API не предоставляет idempotency key для `sendMessage`. Поэтому неопределённый результат нельзя автоматически повторять: сообщение могло быть принято до разрыва соединения.

## Доступ и секреты

`anon` не получает table grants, RLS policies или EXECUTE на lead RPC. Authenticated non-admin получает ноль строк; admin может читать четыре public lead tables и менять только `leads.status`. Service role используется только в `server-only` repository.

Обязательные server variables для формы: `SUPABASE_SERVICE_ROLE_KEY`, `LEAD_IP_HASH_SECRET` (не менее 32 символов). Для production Telegram delivery дополнительно задаются парой `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`. Токен, raw IP, provider body и request headers не логируются и не сохраняются.

## Проверено

- TypeScript, ESLint и 59 unit tests в 12 файлах.
- Clean local reset всех трёх migrations и Supabase DB lint без ошибок.
- Transactional `integrity.sql` и `rls.sql`: 24 public tables, 44 policies, grants, lead submit/idempotency/snapshot/history/outbox и anon/non-admin isolation.
- Fresh production build и 16 local integration tests: Auth/RLS/Storage/catalog/SEO плюс реальные lead HTTP cases, honeypot, draft product, replay/conflict и rate limit.
- Desktop и 390×844 browser QA: dialog tabs, product context, field errors/focus, consent, real success state и отсутствие console errors.

Remote Supabase и реальный Telegram chat не изменялись. Перед production владелец должен применить migration после backup/dry run, задать secrets, отправить одну контролируемую заявку в тестовый chat и юридически утвердить тексты privacy/personal-data.

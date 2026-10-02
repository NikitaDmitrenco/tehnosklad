# Лог прогонов E2E (падения и классификация)

Протокол: `docs/e2e-run-rules.md`. Каждый прогон добавляет секцию внизу;
падение без классификации считается незакрытым.

## 2026-10-01 16:17 · npm run test:e2e:admin (admin, headed, repeat=1) · итог 83 passed / 2 failed

| ADM-ID      | Заголовок теста                             | Что проверял (1 строка)                                         | Классификация | Краткий текст ошибки                                                                                                                                                                                                                                          |
| ----------- | ------------------------------------------- | --------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADM-LEAD-11 | Double status submit yields one history row | двойной сабмит смены статуса заявки → ровно одна строка истории | баг теста     | `expect(data?.status).toBe("contacted")` → Received: `"new"`; на снимке кнопка «Сохранение…» (action in-flight) — тест читает БД, не дождавшись server action (нет `expectSaved`, в отличие от ADM-LEAD-07)                                                   |
| ADM-ORPH-02 | Clean orphan object                         | удаление orphan-файла из Storage через /admin/media/orphans     | баг теста     | карточка не найдена (timeout 5000ms), страница «Orphan-файлов нет»: файл загружен в префикс `e2e-orphan-…/`, а сканер (`repository.ts:639`) обходит только UUID-папки товаров (`{productId}/…`); реальные orphan-объекты создаются только под UUID-префиксами |

Не выполнились (serial-блок прерван падением ORPH-02): ADM-ORPH-03, ADM-ORPH-04.

Ожидаемые падения (`test.fail`, учтены в passed): ADM-LEAD-08/09/10 (BUG-05),
ADM-CAT-16 (BUG-01), ADM-CAT-21 (BUG-06).

## 2026-10-01 17:51 · npx playwright test e2e/admin-leads.spec.ts e2e/admin-orphans.spec.ts --project=admin --headed --reporter=list · итог 16 passed / 0 failed

Падений нет.

Повтор после фиксов багов тестов (оба закрыты):

- ADM-LEAD-11 — добавлен `expectSaved(page)` после двойного клика, перед
  чтением БД (ожидание `?saved=1`);
- ADM-ORPH-02 — orphan создаётся в `{uuid}/{uuid}.png` (контракт сканера
  `repository.ts:639` и `reconcileImageEntryAction`).

Serial-блок целиком: ADM-ORPH-01..04 passed. Ожидаемые падения (`test.fail`):
ADM-LEAD-08/09/10 (BUG-05) — учтены в passed.

## 2026-10-01 19:38 · npx playwright test e2e/admin-leads.spec.ts -g "ADM-LEAD-08" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (диагностика, изолированно) · итог 4 passed / 0 failed

| ADM-ID      | Заголовок теста                              | Что проверял (1 строка)                                            | Классификация                       | Краткий текст ошибки                                                                                                                                        |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADM-LEAD-08 | Outbox visible with retry UI (BUG-05)        | при permanent_failure доставки кнопка «Повторно отправить в Telegram» видна | баг приложения (BUG-05), test.fail  | ожидаемое падение 3/3 стабильно; `test.fail`-причина: «UI shows «Delivery отсутствует.» although the outbox row exists; retry button absent» (spec:141-151)   |

test.fail: падение = баг подтверждён. Изолированно 3/3 — стабильно, не флейк.

## 2026-10-01 19:39 · npx playwright test e2e/admin-leads.spec.ts -g "ADM-LEAD-09" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (диагностика, изолированно) · итог 4 passed / 0 failed

| ADM-ID      | Заголовок теста                                | Что проверял (1 строка)                                          | Классификация                      | Краткий текст ошибки                                                                                                              |
| ----------- | ---------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| ADM-LEAD-09 | manual_review requires confirm_uncertain (BUG-05) | чекбокс confirm_uncertain обязателен и рендерится при manual_review | баг приложения (BUG-05), test.fail | ожидаемое падение 3/3 стабильно; `test.fail`-причина: «retry form with confirm_uncertain is not rendered» (spec:161-169)            |

test.fail: падение = баг подтверждён. Изолированно 3/3 — стабильно, не флейк.

## 2026-10-01 19:41 · npx playwright test e2e/admin-leads.spec.ts -g "ADM-LEAD-10" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (диагностика, изолированно) · итог 4 passed / 0 failed

| ADM-ID      | Заголовок теста                            | Что проверял (1 строка)                                   | Классификация                      | Краткий текст ошибки                                                                                                       |
| ----------- | ------------------------------------------ | --------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ADM-LEAD-10 | Requeue after permanent_failure (BUG-05)   | кнопка requeue видна и работает для delivery permanent_failure | баг приложения (BUG-05), test.fail | ожидаемое падение 3/3 стабильно; `test.fail`-причина: «retry button hidden for a permanent_failure delivery» (spec:186-199) |

test.fail: падение = баг подтверждён. Изолированно 3/3 — стабильно, не флейк.

## 2026-10-01 19:42 · npx playwright test e2e/admin-categories.spec.ts -g "ADM-CAT-16" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (диагностика, изолированно) · итог 4 passed / 0 failed

| ADM-ID      | Заголовок теста                                 | Что проверял (1 строка)                                    | Классификация                     | Краткий текст ошибки                                                                                                     |
| ----------- | ----------------------------------------------- | ---------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| ADM-CAT-16  | SEO fields accept documented max 180/320 (BUG-01) | SEO title/description принимают 180/320 как в документации | баг приложения (BUG-01), test.fail | ожидаемое падение 3/3 стабильно; UI maxLength 70/160 не даёт ввести 180/320 (admin-forms.tsx:92,106 — тест:447-453)      |

test.fail: падение = баг подтверждён. Изолированно 3/3 — стабильно, не флейк.

## 2026-10-01 19:44 · npx playwright test e2e/admin-categories.spec.ts -g "ADM-CAT-21" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (диагностика, изолированно) · итог 4 passed / 0 failed

| ADM-ID      | Заголовок теста                                | Что проверял (1 строка)                                        | Классификация                     | Краткий текст ошибки                                                                                                          |
| ----------- | ---------------------------------------------- | -------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ADM-CAT-21  | Invalid image type → intended upload_invalid (BUG-06) | невалидное изображение даёт код ошибки upload_invalid, а не validation | баг приложения (BUG-06), test.fail | ожидаемое падение 3/3 стабильно (25s на прогон — загрузка файлов); `actionCode` возвращает `validation` (actions.ts:39-43)     |

test.fail: падение = баг подтверждён. Изолированно 3/3 — стабильно, не флейк.

## 2026-10-01 19:47 · npx playwright test e2e/admin-leads.spec.ts -g "ADM-LEAD-11" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (диагностика, изолированно; T1 из реестра) · итог 4 passed / 0 failed

| ADM-ID      | Заголовок теста                              | Что проверял (1 строка)                                   | Классификация | Краткий текст ошибки                                                        |
| ----------- | -------------------------------------------- | --------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| ADM-LEAD-11 | Double status submit yields one history row  | двойной клик «Изменить статус» → ровно одна строка истории | баг теста (исправлен, d60230e) | падений нет: 3/3 passed (2.9s), стабильно — `expectSaved` (spec:217) снимает гонку чтения БД |

Прогон подтверждает классификацию 2026-10-01: падение было багом теста, не приложения.

## 2026-10-01 19:49 · npx playwright test e2e/admin-orphans.spec.ts -g "ADM-ORPH-02" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (диагностика, изолированно; T2 из реестра) · итог 4 passed / 0 failed

| ADM-ID      | Заголовок теста     | Что проверял (1 строка)                                  | Классификация                  | Краткий текст ошибки                                                                       |
| ----------- | ------------------- | -------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| ADM-ORPH-02 | Clean orphan object | очистка orphan-файла из Storage через /admin/media/orphans | баг теста (исправлен, fbc0fda) | падений нет: 3/3 passed (2.9–3.7s), стабильно — orphan создаётся в `{uuid}/{uuid}.png` по контракту сканера |

Прогон подтверждает классификацию 2026-10-01: падение было багом теста (префикс `e2e-orphan-…/` вне контракта сканера `repository.ts:639`), не приложения.

## 2026-10-01 20:12 · npx playwright test e2e/admin-leads.spec.ts -g "ADM-LEAD-08" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (контроль после диагностики окружения) · итог 4 passed / 0 failed

| ADM-ID      | Заголовок теста                       | Что проверял (1 строка)                                            | Классификация                       | Краткий текст ошибки                                                                     |
| ----------- | ------------------------------------- | ------------------------------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| ADM-LEAD-08 | Outbox visible with retry UI (BUG-05) | при permanent_failure доставки кнопка «Повторно отправить в Telegram» видна | баг приложения (BUG-05), test.fail  | ожидаемое падение 3/3 стабильно; повторный прогон после «зависания» — окружение (логин/сервер) исправно |

Повторный прогон подтвердил: предыдущее «зависание» было просто открытым idle-браузером playwright-cli (тест не выполнялся), а не сбоем окружения.


## 2026-10-01 22:05 · npx playwright test e2e/{admin-categories,admin-products,admin-settings,admin-attributes}.spec.ts -g "ADM-CAT-10 creates / ADM-CAT-11 / ADM-CAT-20 / ADM-CAT-21 / ADM-PROD-05 / ADM-SET-01 / ADM-ATTR-01" --project=admin --headed --reporter=list --workers=1 --repeat-each=3 (точечный после задачи 0: limits.ts + параметризованные ошибки) · итог 22 passed / 0 failed

Падений нет.

Затронутые задачей 0 тесты создания/редактирования форм прошли 3/3. ADM-CAT-21 — ожидаемое `test.fail` (BUG-06 чинится в задаче 2). Сознательно не включены: `ADM-CAT-10 text limits` (закодировано старое поведение DOC-03, обновляется в задаче 4), `ADM-CAT-16` (test.fail снимается в задаче 5 после смены maxLength на 180/320), `ADM-CAT-15` (ожидает generic-текст B3, задача 3).

## 2026-10-01 22:26 · npx playwright test e2e/admin-leads.spec.ts -g "ADM-LEAD-06|08|09|10|11" --project=admin --headed --reporter=list --workers=1 --repeat-each=3 (точечный после задачи 1: фикс B4/BUG-05) · итог 16 passed / 0 failed

Падений нет.

ADM-LEAD-08/09/10 после снятия test.fail проходят 3/3 как обычные: outbox-строка видна в UI, кнопка «Повторно отправить в Telegram» и чекбокс manual_review рендерятся. Классификация падений 2026-10-01 (баг приложения BUG-05) — исправлено коммитом 9482276.

## 2026-10-02 06:20–07:05 · npx playwright test e2e/admin-tmp-upload-matrix.spec.ts --project=admin --headed --reporter=list --workers=1 (матрица загрузки 3/4,5/7/15/50 МБ, задача 2; временный спек, после прогона удалён) · итог 3 passed / 0 failed (первый прогон), 3 passed / 0 (после guard), 2 passed / 0 (повтор B с 4,2 МБ)

Падений нет.

Матрица «что видит пользователь» (итоговое поведение, после guard в src/proxy.ts):
| Файл (байт) | Клиентская проверка вкл. (обычный путь) | Обход клиентской проверки (native form submit) |
| --- | --- | --- |
| 3 000 000 (≈2,9 МБ) | без ошибки, кнопка активна → `?saved=1`, изображение загружено | — |
| 4 200 000 (4,0 МиБ) | ошибка «Файл 4,0 МБ, максимум 4 МБ. Уменьшите фото или сохраните как JPG.», submit заблокирован, навигации нет | баннер приложения: тот же текст, `?error=upload_too_large` |
| 4 500 000 (4,3 МиБ) | клиентская ошибка с размером и лимитом, submit заблокирован | 413, страница «Слишком большой запрос… Лимит платформы на один запрос: 4,5 МБ…» |
| 7 000 000 | клиентская ошибка, submit заблокирован | 413, та же понятная страница |
| 15 000 000 | клиентская ошибка, submit заблокирован | 413, та же страница |
| 50 000 000 | клиентская ошибка, submit заблокирован | 413, та же страница |

До guard (первый прогон) обход для 7/15/50 МБ давал **500 «Internal Server Error»** — устранено guard'ом по `content-length` в `src/proxy.ts`. Белых экранов, зависших форм и технического текста нет; страница восстанавливается перезагрузкой. Каждый вариант проверен, форма не отправляется при клиентской ошибке (URL без `saved=`/`error=`).

## 2026-10-02 07:45 · npx playwright test e2e/{admin-categories,admin-products}.spec.ts -g "ADM-CAT-20|ADM-CAT-21|ADM-CAT-23|ADM-PROD-13" --project=admin --headed --reporter=list --workers=1 --repeat-each=3 (точечный после задачи 2: ошибки загрузки BUG-06) · итог 13 passed / 0 failed

Падений нет.

ADM-CAT-21 после снятия test.fail проверяет конкретный текст «Содержимое файла не соответствует его расширению…» (`upload_extension_mismatch`) и проходит 3/3. ADM-CAT-23 (новый): oversize-файл блокируется в браузере текстом с фактическим размером и лимитом, кнопка disabled, навигации нет, страница жива — 3/3. ADM-CAT-20/PROD-13 (валидные загрузки) — 3/3.

## 2026-10-02 08:13 · npx playwright test e2e/admin-categories.spec.ts -g "ADM-CAT-15" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (точечный после задачи 3: B3/BUG-04) · итог 4 passed / 0 failed

Падений нет.

ADM-CAT-15 теперь проверяет конкретный текст ошибки триггера «Нельзя опубликовать подкатегорию, пока родительская категория не опубликована. Сначала опубликуйте родительскую.» (код `Published child category requires a published parent`) — 3/3.

## 2026-10-02 08:14 · npx playwright test e2e/admin-categories.spec.ts -g "ADM-CAT-24" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (обратный сценарий B3) · итог 4 passed / 0 failed

Падений нет.

ADM-CAT-24 (новый): снятие родителя с публикации при опубликованной подкатегории → «Нельзя снять категорию с публикации или архивировать её, пока есть опубликованные подкатегории. Сначала снимите с публикации подкатегории.» (код `Published child categories require an active parent`), родитель остаётся опубликованным в БД — 3/3.

## 2026-10-02 08:24 · npx playwright test e2e/admin-categories.spec.ts -g "ADM-CAT-10" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (первый прогон после задачи 4) · итог 4 passed / 3 failed

| ADM-ID | Заголовок теста | Что проверял (1 строка) | Классификация | Краткий текст ошибки |
|--------|-----------------|-------------------------|---------------|----------------------|
| ADM-CAT-10 | text limits — save at limits.ts boundary, above clamped | на границе 160/180/280 и выше лимита | баг теста (исправлен тем же коммитом) | `[adminRead] category slug cat-s181-…: JSON object requested, multiple (or no) rows returned` — RO-slug ${slugRu}-ro после клампа до 180 совпал с RU-slug; uniqueness в БД per-locale, нашёлся 2 строки и maybeSingle упал. Продукт не при чём: шаги name/short (кламп до 160/280, сохранение на границе без 23514) прошли. |

## 08:39 · повтор ADM-CAT-10 после правки (RO-slug раздельный, ожидания из limits.ts) · итог 7 passed / 0 failed

Падений нет. 3/3 по обоим тестам ADM-CAT-10: на границе сохранение без ошибок, выше лимита браузер обрезает ровно до limit, в БД длина равна лимиту.

## 2026-10-02 08:35 · npx playwright test e2e/admin-categories.spec.ts -g "ADM-CAT-15|ADM-CAT-16|ADM-CAT-21|ADM-CAT-24" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (соседние тесты категорий после задач 3–4; ADM-CAT-16 снят с test.fail — maxLength 180/320 в коде с задачи 0) · итог 13 passed / 0 failed

Падений нет. Все четыре теста 3/3.

## 2026-10-02 09:06 · npx playwright test e2e/{admin-categories,admin-knowledge}.spec.ts -g "ADM-CAT-16|ADM-KB-01" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (точечный после задачи 5: SEO-счётчик B1/BUG-01) · итог 7 passed / 0 failed

Падений нет.

ADM-CAT-16 (без test.fail): до 70/160 предупреждения нет, выше 70/160 — «Поисковики могут обрезать, рекомендуется до 70/160 символов.», жёсткие 180/320 вводятся полностью — 3/3. ADM-KB-01 (общий компонент счётчика) — 3/3.

## 2026-10-02 09:26 · npx playwright test e2e/{admin-dashboard,admin-leads}.spec.ts -g "ADM-DASH-03|ADM-DASH-05|ADM-LEAD-02|ADM-LEAD-03" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (точечный после задачи 6: фильтр доставки B2/BUG-02) · итог 13 passed / 0 failed

Падений нет.

ADM-DASH-05 (новый): карточка «Ошибки Telegram» ведёт на /admin/leads?delivery=errors, селект доставки применён, число на карточке равно числу строк списка (.admin-list-card), заявка с permanent_failure присутствует — 3/3. ADM-DASH-03, ADM-LEAD-02 (форма фильтров), ADM-LEAD-03 (CSV) — 3/3.

## 2026-10-02 09:44 · npx playwright test e2e/{admin-categories,admin-products}.spec.ts -g "ADM-CAT-20|ADM-CAT-21|ADM-CAT-25|ADM-PROD-13" --project=admin --headed --reporter=list --repeat-each=3 --workers=1 (точечный после задачи 7: структурная проверка изображений) · итог 13 passed / 0 failed

Падений нет.

ADM-CAT-25 (новый): обрезанный PNG (валидный заголовок, нет IEND) → «Файл повреждён или обрезан и не открывается как изображение. Сохраните изображение заново и повторите загрузку.» (upload_corrupted) — 3/3. ADM-CAT-20/PROD-13 (валидные загрузки через полную структурную проверку) и ADM-CAT-21 (mismatch) — 3/3.

## 2026-10-02 09:49 · npx playwright test e2e/admin-auth.spec.ts --project=admin --headed --reporter=list --workers=1 --repeat-each=3 (точечный после задачи 8: унификация дефолтов креденшелов) · итог 22 passed / 0 failed

Падений нет. Логин/логаут и все ADM-AUTH-01..07 — 3/3 (дефолт e2e/helpers/env.ts теперь совпадает с ensure-admin.mjs: admin.e2e@tehnosklad.local).

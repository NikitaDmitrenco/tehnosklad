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

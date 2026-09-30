# План и покрытие E2E-тестов админки (admin)

Спецификация: `docs/admin-functionality-report.md` (82 сценария: P0=42, P1=27, P2=13).
Среда: production-like (`npm run build` → `next start -p 3000`), локальный Supabase, `CATALOG_DATA_SOURCE=supabase`.

## IMPLEMENTATION PLAN (Phase 0)

| # | Шаг (порядок)                                                              | Файлы                                        | P0 | P1 | P2 |
| - | -------------------------------------------------------------------------- | -------------------------------------------- | -- | -- | -- |
| 1 | Shared foundation: unique-data factory, cleanup с правильным FK-порядком (отдельный коммит), read-only DB helper (local-only guard), non-admin helper, anonymous context, page-хелперы (навигация, ожидание server action, чтение flash) | `e2e/helpers/*`, отдельный коммит в `admin-db.ts` | —  | —  | —  |
| 2 | Auth: вход/редиректы/неверный пароль/non-admin/выход                      | `admin-auth.spec.ts`                          | 5  | 1  | 1  |
| 3 | Dashboard: метрики+навигация                                              | `admin-dashboard.spec.ts`                     | 1  | 3  | 0  |
| 4 | Categories: list + create + edit/image/archive                             | `admin-categories.spec.ts`                    | 7  | 6  | 3  |
| 5 | Attribute groups                                                           | `admin-attribute-groups.spec.ts`              | 3  | 1  | 0  |
| 6 | Attributes (+options/bindings)                                             | `admin-attributes.spec.ts`                    | 4  | 2  | 2  |
| 7 | Products: list + create + editor/attributes/images/archive/preview          | `admin-products.spec.ts`                      | 9  | 7  | 2  |
| 8 | Leads: list/filters/CSV + detail/status/Telegram requeue (BUG-05 → test.fail) | `admin-leads.spec.ts`                       | 6  | 4  | 1  |
| 9 | Settings: save pair + empty rejected                                       | `admin-settings.spec.ts`                      | 2  | 1  | 0  |
| 10 | Knowledge: RU/RO статьи, delete                                            | `admin-knowledge.spec.ts`                     | 2  | 1  | 1  |
| 11 | Orphans: empty/clean object/clean metadata                                 | `admin-orphans.spec.ts`                       | 3  | 0  | 1  |
| 12 | Logs: периоды                                                             | `admin-logs.spec.ts`                          | 0  | 1  | 2  |

Приоритет внутри тира: порядок отчёта. Итог: P0=**42**, P1=**27**, P2=**13** (пересчёт по строкам сценариев; P2 распределён по всем área: auth 1, categories 3, attributes 2, products 2, leads 1, knowledge 1, logs 2, orphans 1).

- Known bugs → intended + `test.fail()`: ADM-CAT-16 (BUG-01), ADM-LEAD-08/10 (BUG-05), ADM-CAT-21 (BUG-06). DOC-03 / truncated-PNG — OWNER DECISION, без `test.fail()`.
- Cleanup: существующий `adminDb.cleanUpByRunId` не удаляет `category_slug_routes`/`product_slug_routes` до категорий/товаров (FK RESTRICT) — **выбран менее инвазивный вариант: отдельный коммит `test: fix cleanUpByRunId FK order`** (минимальная правка существующего хелпера); остальная новая очистка (knowledge, storage-объекты) — в новых хелперах.
- Специфичные ожидания: скоуп по `data-admin-form`, никогда bare `form`; уникальные slug/sku/name через runId; cleanup в `afterEach/afterAll`.

## Статусы сценариев

Заполняется по мере реализации: `scenario ID → test title → file → status (passed | fixme(BUG-ID) | not-automated(reason))`.

## Как запускать

(заполняется в Phase 4)

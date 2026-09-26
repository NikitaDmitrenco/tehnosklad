// Diagnoses a "Каталог временно недоступен" error against a real Supabase
// project. The catalog page throws when any of its server queries fails, and
// the error boundary hides which one, so this replays exactly the queries the
// page makes -- with the same selects, the same RPC arguments and the same
// anon key -- and reports the first one that breaks.
//
// Usage (production values, read-only, never writes):
//   NEXT_PUBLIC_SUPABASE_URL=... \
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
//   node scripts/diagnose-catalog.mjs [ru|ro]
//
// Values are also read from .env.local when the variables are absent.
// SUPABASE_SERVICE_ROLE_KEY is optional: when present, the script explains why
// a product the search returned is invisible to the public role.

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const locale = process.argv[2] === "ro" ? "ro" : "ru";
const alternate = locale === "ru" ? "ro" : "ru";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !publishableKey) {
  console.error(
    "Не заданы NEXT_PUBLIC_SUPABASE_URL и/или NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
  process.exit(2);
}

// Identical to src/features/catalog/supabase/transport.ts.
const categorySelect =
  "id,presentation_key,sort_order,image_storage_path,category_translations(locale,name,slug,short_description,description,seo_title,seo_description)";
const productSelect =
  "id,brand,model,sku,price_minor,old_price_minor,currency,availability,is_new,sort_order,product_translations(locale,name,slug,short_description,description,seo_title,seo_description),categories!inner(id,presentation_key,sort_order,image_storage_path,category_translations(locale,name,slug,short_description,description,seo_title,seo_description)),product_images(id,storage_path,sort_order,is_primary,product_image_translations(locale,alt_text))";
const specificationSelect =
  "id,product_id,ordinal,text_value_key,number_value,boolean_value,color_value,product_attribute_value_translations(locale,text_value),products!inner(category_id),attributes!inner(code,data_type,is_filterable,sort_order,category_attributes(category_id,is_filterable,sort_order),attribute_translations(locale,name,unit_label),attribute_groups(code,sort_order,attribute_group_translations(locale,name))),attribute_options(code,attribute_option_translations(locale,label))";

const PAGE_SIZE = 9; // CATALOG_PAGE_SIZE
const POSTGREST_MAX_ROWS = 1000;

const client = createClient(supabaseUrl, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const failures = [];

function report(step, ok, detail) {
  console.log(
    `${ok ? "OK  " : "СБОЙ"}  ${step}${detail ? ` — ${detail}` : ""}`,
  );
  if (!ok) failures.push(step);
}

async function timed(label, run) {
  const startedAt = Date.now();
  const { data, error } = await run();
  const elapsed = Date.now() - startedAt;
  if (error) {
    report(
      label,
      false,
      `${elapsed} мс, код ${error.code ?? "?"}: ${error.message}${
        error.details ? ` | details: ${error.details}` : ""
      }${error.hint ? ` | hint: ${error.hint}` : ""}`,
    );
    return { data: null, elapsed, error };
  }
  const rows = Array.isArray(data) ? data.length : data === null ? 0 : 1;
  const slow = elapsed >= 5000 ? " ВНИМАНИЕ: близко к statement timeout" : "";
  report(label, true, `${elapsed} мс, строк: ${rows}${slow}`);
  return { data, elapsed, error: null };
}

function localeCount(translations, wanted) {
  return (translations ?? []).filter((item) => item.locale === wanted).length;
}

// The checks below mirror every invariant that
// src/features/catalog/supabase/mapper.ts enforces by throwing.
function checkProductIntegrity(products) {
  const problems = [];
  for (const product of products) {
    const label = `${product.sku ?? product.id}`;
    for (const wanted of [locale, alternate]) {
      if (localeCount(product.product_translations, wanted) !== 1) {
        problems.push(
          `товар ${label}: переводов на ${wanted} должно быть ровно 1, найдено ${localeCount(product.product_translations, wanted)}`,
        );
      }
    }
    const category = product.categories;
    if (!category) {
      problems.push(`товар ${label}: не отдалась категория`);
    } else {
      for (const wanted of [locale, alternate]) {
        if (localeCount(category.category_translations, wanted) !== 1) {
          problems.push(
            `категория ${category.id} (товар ${label}): переводов на ${wanted} ${localeCount(category.category_translations, wanted)}, нужен 1`,
          );
        }
      }
    }
    if (product.currency !== "MDL") {
      problems.push(
        `товар ${label}: валюта ${product.currency}, ожидается MDL`,
      );
    }
    if (
      product.old_price_minor !== null &&
      Number(product.old_price_minor) <= Number(product.price_minor)
    ) {
      problems.push(
        `товар ${label}: old_price_minor (${product.old_price_minor}) не больше price_minor (${product.price_minor})`,
      );
    }
    for (const image of product.product_images ?? []) {
      for (const wanted of [locale, alternate]) {
        if (localeCount(image.product_image_translations, wanted) !== 1) {
          problems.push(
            `товар ${label}, картинка ${image.id}: alt на ${wanted} отсутствует или задублирован`,
          );
        }
      }
    }
  }
  return problems;
}

function checkSpecificationIntegrity(specifications) {
  const problems = [];
  for (const row of specifications) {
    const attribute = row.attributes;
    const label = `значение ${row.id} (атрибут ${attribute?.code ?? "?"})`;
    if (!attribute) {
      problems.push(`${label}: не отдался атрибут`);
      continue;
    }
    for (const wanted of [locale, alternate]) {
      if (localeCount(attribute.attribute_translations, wanted) !== 1) {
        problems.push(`${label}: нет перевода атрибута на ${wanted}`);
      }
    }
    const bindings = (attribute.category_attributes ?? []).filter(
      (binding) => binding.category_id === row.products?.category_id,
    );
    if (bindings.length !== 1) {
      problems.push(
        `${label}: привязок к категории товара должно быть ровно 1, найдено ${bindings.length} (маппер бросает "Attribute requires exactly one category binding")`,
      );
    }
    if (
      (attribute.data_type === "single_select" ||
        attribute.data_type === "multi_select") &&
      !row.attribute_options
    ) {
      problems.push(
        `${label}: опция не видна публичной роли (скорее всего is_active = false) — маппер бросает "Missing select option"`,
      );
    }
    if (attribute.data_type === "text") {
      if (!row.text_value_key) problems.push(`${label}: пустой text_value_key`);
      if (localeCount(row.product_attribute_value_translations, locale) !== 1) {
        problems.push(`${label}: нет перевода значения на ${locale}`);
      }
    }
    if (attribute.data_type === "number" && row.number_value === null) {
      problems.push(`${label}: пустое number_value`);
    }
    if (attribute.data_type === "boolean" && row.boolean_value === null) {
      problems.push(`${label}: пустое boolean_value`);
    }
    if (attribute.data_type === "color" && !row.color_value) {
      problems.push(`${label}: пустое color_value`);
    }
    const group = attribute.attribute_groups;
    if (group) {
      for (const wanted of [locale, alternate]) {
        if (localeCount(group.attribute_group_translations, wanted) !== 1) {
          problems.push(
            `${label}: нет перевода группы ${group.code} на ${wanted}`,
          );
        }
      }
    }
  }
  return problems;
}

function printProblems(title, problems) {
  if (problems.length === 0) {
    report(title, true, "нарушений не найдено");
    return;
  }
  report(title, false, `нарушений: ${problems.length}`);
  for (const problem of problems.slice(0, 15))
    console.log(`        · ${problem}`);
  if (problems.length > 15) {
    console.log(`        · … и ещё ${problems.length - 15}`);
  }
}

async function explainInvisibleProducts(ids) {
  if (!serviceRoleKey) {
    console.log(
      "        Задай SUPABASE_SERVICE_ROLE_KEY, чтобы скрипт объяснил, почему эти товары не видны.",
    );
    return;
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin
    .from("products")
    .select(
      "id,sku,is_published,archived_at,category_id,categories(id,is_published,archived_at)",
    )
    .in("id", ids);
  if (error) {
    console.log(`        Не удалось разобрать причину: ${error.message}`);
    return;
  }
  for (const product of data ?? []) {
    const category = product.categories;
    console.log(
      `        · ${product.sku}: товар published=${product.is_published} archived=${product.archived_at ?? "нет"}; ` +
        `категория published=${category?.is_published} archived=${category?.archived_at ?? "нет"}`,
    );
  }
}

async function main() {
  console.log(`Проект: ${supabaseUrl}`);
  console.log(`Локаль: ${locale}\n`);

  console.log("--- Запросы, общие для всех публичных страниц ---");
  const settings = await timed("layout: site_settings", () =>
    client.from("site_settings").select("key,value").eq("locale", locale),
  );
  if (settings.data) {
    const required = [
      "phone_display",
      "phone_href",
      "address",
      "open_days",
      "open_time",
      "closed_day",
      "contact_text",
    ];
    const broken = required.filter(
      (key) => settings.data.filter((row) => row.key === key).length !== 1,
    );
    printProblems(
      "layout: каждая настройка ровно один раз",
      broken.map((key) => `ключ ${key} отсутствует или задублирован`),
    );
  }

  await timed("главная + каталог: список категорий", () =>
    client
      .from("categories")
      .select(categorySelect)
      .eq("is_published", true)
      .is("archived_at", null)
      .order("sort_order"),
  );

  await timed("главная: RPC get_popular_products_30d", () =>
    client.rpc("get_popular_products_30d", { p_limit: 7 }),
  );

  console.log("\n--- Запросы, которые есть ТОЛЬКО на странице каталога ---");
  const search = await timed(
    "каталог: RPC search_public_catalog_product_ids",
    () =>
      client.rpc("search_public_catalog_product_ids", {
        p_locale: locale,
        p_category_id: null,
        p_query: null,
        p_brand: null,
        p_availability: null,
        p_min_price_minor: null,
        p_max_price_minor: null,
        p_attributes: {},
        p_sort: "popular",
        p_limit: PAGE_SIZE,
        p_offset: 0,
      }),
  );

  if (search.data) {
    const ids = search.data
      .map((row) => row.product_id)
      .filter((id) => Boolean(id));
    const total = search.data.length ? Number(search.data[0].total_count) : 0;
    console.log(`        всего товаров по счётчику RPC: ${total}`);
    const page = await timed("каталог: выборка товаров страницы по id", () =>
      client.from("products").select(productSelect).in("id", ids),
    );
    if (page.data) {
      const returned = new Set(page.data.map((row) => row.id));
      const missing = ids.filter((id) => !returned.has(id));
      if (missing.length) {
        report(
          "каталог: RPC и RLS согласованы",
          false,
          `RPC вернул ${missing.length} товар(ов), которых публичная роль не видит — страница падает с "Catalog search returned a missing product"`,
        );
        await explainInvisibleProducts(missing);
      } else {
        report("каталог: RPC и RLS согласованы", true, "расхождений нет");
      }
      printProblems(
        "каталог: целостность товаров страницы",
        checkProductIntegrity(page.data),
      );
    }
  }

  console.log("\n--- Фасеты: самый тяжёлый запрос, тянет весь каталог ---");
  const all = await timed("фасеты: все опубликованные товары без limit", () =>
    client
      .from("products")
      .select(productSelect)
      .eq("is_published", true)
      .is("archived_at", null)
      .order("sort_order"),
  );
  if (all.data) {
    if (all.data.length === POSTGREST_MAX_ROWS) {
      report(
        "фасеты: ответ не обрезан лимитом PostgREST",
        false,
        `ровно ${POSTGREST_MAX_ROWS} строк — почти наверняка упёрлись в db.max_rows`,
      );
    }
    printProblems(
      "фасеты: целостность всех товаров",
      checkProductIntegrity(all.data),
    );
    const ids = all.data.map((row) => row.id);
    const specifications = await timed(
      "фасеты: значения атрибутов всех товаров",
      () =>
        client
          .from("product_attribute_values")
          .select(specificationSelect)
          .in("product_id", ids),
    );
    if (specifications.data) {
      if (specifications.data.length === POSTGREST_MAX_ROWS) {
        report(
          "фасеты: значения атрибутов не обрезаны",
          false,
          `ровно ${POSTGREST_MAX_ROWS} строк — упёрлись в db.max_rows`,
        );
      }
      printProblems(
        "фасеты: целостность значений атрибутов",
        checkSpecificationIntegrity(specifications.data),
      );
    }
  }

  console.log("");
  if (failures.length === 0) {
    console.log(
      "ВЕРДИКТ: все запросы страницы каталога отработали. Причина не в базе — смотри Runtime Logs на Vercel и переменные окружения деплоя.",
    );
    return;
  }
  console.log("ВЕРДИКТ: сломано следующее —");
  for (const failure of failures) console.log(`  • ${failure}`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error("Скрипт упал:", error);
  process.exit(1);
});

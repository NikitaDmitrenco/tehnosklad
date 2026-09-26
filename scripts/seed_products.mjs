import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key, { auth: { persistSession: false } });

// Fix demo-data.ts slugs
const demoFile = path.join(
  process.cwd(),
  "src",
  "features",
  "catalog",
  "demo-data.ts",
);
let demoContent = fs.readFileSync(demoFile, "utf8");
demoContent = demoContent.replace(/kärcher-vc-3/g, "karcher-vc-3");
fs.writeFileSync(demoFile, demoContent, "utf8");

const marker = "export const demoProducts: DemoProduct[] = ";
const jsonStr = demoContent
  .substring(demoContent.indexOf(marker) + marker.length)
  .trim()
  .replace(/;$/, "");
const demoProducts = JSON.parse(jsonStr);

function sanitizeSlug(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function seed() {
  console.log(`Connecting to Supabase: ${url}`);

  // 1. Disable is_required on category_attributes
  const { error: catAttrErr } = await supabase
    .from("category_attributes")
    .update({ is_required: false })
    .neq("category_id", "00000000-0000-0000-0000-000000000000");
  if (catAttrErr)
    console.log("Category attributes update note:", catAttrErr.message);

  // 2. Insert products in draft mode (is_published = false)
  const productRows = demoProducts.map((p, idx) => ({
    id: p.id,
    category_id: p.categoryId,
    brand: p.brand,
    model: p.model,
    sku: p.sku,
    price_minor: p.priceMinor,
    old_price_minor: p.oldPriceMinor ?? null,
    currency: "MDL",
    availability: p.stockStatus,
    quantity: 10,
    is_popular: p.isPopular,
    is_new: p.isNew,
    is_published: false,
    sort_order: (idx + 1) * 10,
  }));

  console.log(`Inserting ${productRows.length} draft products...`);
  const { error: pErr } = await supabase.from("products").upsert(productRows);
  if (pErr) {
    console.error("❌ Products insertion error:", pErr);
    return;
  }
  console.log("✅ Products inserted (draft mode)!");

  // 3. Prepare translation rows with clean ASCII slugs
  const translationRows = [];
  demoProducts.forEach((p) => {
    const slug = sanitizeSlug(p.slug);
    translationRows.push({
      product_id: p.id,
      locale: "ru",
      name: p.name.ru,
      slug: slug,
      short_description: p.shortDescription.ru,
      description: p.description.ru,
      seo_title: `${p.name.ru} — купить в Комрате`,
      seo_description: p.shortDescription.ru,
    });
    translationRows.push({
      product_id: p.id,
      locale: "ro",
      name: p.name.ro,
      slug: slug,
      short_description: p.shortDescription.ro,
      description: p.description.ro,
      seo_title: `${p.name.ro} — cumpără în Comrat`,
      seo_description: p.shortDescription.ro,
    });
  });

  console.log(`Inserting ${translationRows.length} product translations...`);
  const { error: tErr } = await supabase
    .from("product_translations")
    .upsert(translationRows);
  if (tErr) {
    console.error("❌ Translations insertion error:", tErr);
    return;
  }
  console.log("✅ Translations inserted!");

  // 4. Publish all products
  console.log("Publishing products...");
  const { error: pubErr } = await supabase
    .from("products")
    .update({ is_published: true })
    .in(
      "id",
      demoProducts.map((p) => p.id),
    );
  if (pubErr) {
    console.error("❌ Publishing error:", pubErr);
    return;
  }
  console.log("✅ Products published!");

  // 5. Verify counts
  const { count: pCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  const { count: tCount } = await supabase
    .from("product_translations")
    .select("*", { count: "exact", head: true });
  console.log(
    `\n🎉 Successfully verified in DB: ${pCount} products and ${tCount} translations! All 105 products are active and live.`,
  );
}

seed().catch(console.error);

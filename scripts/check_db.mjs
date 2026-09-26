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

async function check() {
  const {
    data: products,
    count: pCount,
    error: pErr,
  } = await supabase.from("products").select("*", { count: "exact" });
  const {
    data: trans,
    count: tCount,
    error: tErr,
  } = await supabase
    .from("product_translations")
    .select("*", { count: "exact" });
  const {
    data: cats,
    count: cCount,
    error: cErr,
  } = await supabase.from("categories").select("*", { count: "exact" });
  const {
    data: catTrans,
    count: ctCount,
    error: ctErr,
  } = await supabase
    .from("category_translations")
    .select("*", { count: "exact" });

  console.log("Categories count in DB:", cCount, "Error:", cErr?.message);
  console.log(
    "Category translations count in DB:",
    ctCount,
    "Error:",
    ctErr?.message,
  );
  console.log("Products count in DB:", pCount, "Error:", pErr?.message);
  console.log(
    "Product translations count in DB:",
    tCount,
    "Error:",
    tErr?.message,
  );
}

check();

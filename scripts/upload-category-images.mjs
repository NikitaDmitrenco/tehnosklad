import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local if present
function loadEnv() {
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
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "❌ Ошибка: Отсутствует SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY.",
  );
  console.error(
    "Убедитесь, что заполнен файл .env.local или передайте переменные окружения:",
  );
  console.error(
    "SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-category-images.mjs",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const slugToId = {
  refrigerators: "10000000-0000-4000-8000-000000000001",
  "washing-machines": "10000000-0000-4000-8000-000000000002",
  "stoves-and-cooktops": "10000000-0000-4000-8000-000000000003",
  "microwave-ovens": "10000000-0000-4000-8000-000000000004",
  dishwashers: "10000000-0000-4000-8000-000000000005",
  ovens: "10000000-0000-4000-8000-000000000006",
  dryers: "10000000-0000-4000-8000-000000000007",
  "coffee-machines": "10000000-0000-4000-8000-000000000008",
  vacuums: "10000000-0000-4000-8000-000000000009",
  "robot-vacuums": "10000000-0000-4000-8000-000000000010",
  "electric-kettles": "10000000-0000-4000-8000-000000000011",
  blenders: "10000000-0000-4000-8000-000000000012",
  "food-processors": "10000000-0000-4000-8000-000000000013",
  toasters: "10000000-0000-4000-8000-000000000014",
  "air-conditioners": "10000000-0000-4000-8000-000000000015",
};

// Проверяем оба пути: public/images/categories и supabase_storage_upload/categories
const publicDir = path.join(process.cwd(), "public", "images", "categories");
const uploadDir = path.join(
  process.cwd(),
  "supabase_storage_upload",
  "categories",
);

const sourceDir = fs.existsSync(publicDir) ? publicDir : uploadDir;

if (!fs.existsSync(sourceDir)) {
  console.error(`❌ Папка с изображениями не найдена: ${publicDir}`);
  process.exit(1);
}

async function run() {
  console.log(`🚀 Подключение к Supabase: ${supabaseUrl}`);
  console.log(`📁 Загрузка изображений из папки: ${sourceDir}\n`);

  const files = fs
    .readdirSync(sourceDir)
    .filter((f) => /\.(jpg|jpeg|png|webp|avif)$/i.test(f));

  let successCount = 0;

  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const baseName = file.replace(/\.[^.]+$/, "");
    const ext = path.extname(file).toLowerCase();

    // Определяем ID категории (по UUID либо по слагу)
    const categoryId = slugToId[baseName] || baseName;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        categoryId,
      )
    ) {
      console.log(`⚠️ Пропущен неизвестный файл: ${file}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `categories/${categoryId}${ext === ".jpeg" ? ".jpg" : ext}`;
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : "image/jpeg";

    process.stdout.write(`Загрузка ${file} -> ${storagePath}... `);

    const { error: uploadError } = await supabase.storage
      .from("category-images")
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.log(`❌ Ошибка загрузки: ${uploadError.message}`);
      continue;
    }

    // Обновляем запись в таблице categories
    const { error: dbError } = await supabase
      .from("categories")
      .update({ image_storage_path: storagePath })
      .eq("id", categoryId);

    if (dbError) {
      console.log(
        `⚠️ Файл загружен в Storage, но ошибка обновления БД: ${dbError.message}`,
      );
    } else {
      console.log(`✅ Успешно привязано к категории ${categoryId}`);
      successCount++;
    }
  }

  console.log(`\n🎉 Готово! Успешно обработано: ${successCount} категорий.`);
}

run().catch((err) => {
  console.error("Критическая ошибка:", err);
  process.exit(1);
});

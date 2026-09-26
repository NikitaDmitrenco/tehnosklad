#!/usr/bin/env bash
set -e

# Load .env.local if present
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$NEXT_PUBLIC_SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_KEY" ]; then
  echo "❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  echo "Usage: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... ./scripts/upload-category-images.sh"
  exit 1
fi

UPLOAD_DIR="supabase_storage_upload/categories"

if [ ! -d "$UPLOAD_DIR" ]; then
  echo "❌ Upload directory not found: $UPLOAD_DIR"
  exit 1
fi

echo "🚀 Uploading category images to Supabase: $SUPABASE_URL"

for file in "$UPLOAD_DIR"/*.jpg; do
  [ -e "$file" ] || continue
  filename=$(basename "$file")
  category_id="${filename%.jpg}"
  storage_path="categories/$filename"

  echo -n "Uploading $storage_path... "

  # 1. Upload to Supabase Storage
  upload_res=$(curl -s -X POST "$SUPABASE_URL/storage/v1/object/category-images/$storage_path" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" \
    -H "Content-Type: image/jpeg" \
    -H "x-upsert: true" \
    --data-binary @"$file")

  # 2. Update category in database
  update_res=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/categories?id=eq.$category_id" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{\"image_storage_path\": \"$storage_path\"}")

  echo "✅ Done (Category: $category_id)"
done

echo ""
echo "🎉 All category images uploaded and linked successfully!"

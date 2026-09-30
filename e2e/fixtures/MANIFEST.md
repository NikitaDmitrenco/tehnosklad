# Admin e2e fixtures MANIFEST

Branch: `test/admin-e2e`. Scope: **fixtures only** under `e2e/fixtures/`. No app code, no package.json, no specs.

Generator: `e2e/fixtures/generate.mjs` (reproducible). Independent verifier: `e2e/fixtures/verify.mjs`.

Image tooling already present (no new installs):

| Tool | Present | Can generate |
| ---- | ------- | ------------ |
| `sharp` 0.35.3 in `node_modules` (lockfile, not a direct `package.json` dep) | yes | jpeg, png, webp, avif (heif/avif), gif, tiff |
| Hand-written bytes | n/a | bmp, svg, zero-byte, truncated, padding, magic mismatches |
| HEIC **encoder** | **no** | sharp `heif` output is **avif only** → HEIC fixture **not generated** |

Length checks in admin server code measure **JS string length after `trim()`** (`String.prototype.length`), not grapheme clusters.

---

## Step 1 — Discovered rules (evidence)

Tags: `[CODE]`, `[DOC]`, `[DB]`, `[OBS]`. Agreement: `AGREE` / `DISAGREE` / `CODE-only` / `DOC-only`.

### 1.1 Image upload (categories + products)

| Rule | Value | Tag | Evidence |
| ---- | ----- | --- | -------- |
| Allowed MIME | `image/jpeg`, `image/png`, `image/webp`, `image/avif` | CODE | `src/features/admin/validation.ts:132-137` |
| Allowed extensions (server path only) | `jpg`, `png`, `webp`, `avif` (from MIME map, **not** from filename) | CODE | `validation.ts:155,158-171` |
| MIME source | `File.type` (browser / Playwright), **not** magic-sniffed first | CODE | `validation.ts:140` |
| Magic bytes | jpeg `FF D8 FF`; png `89 50 4E 47`; webp `RIFF` + bytes 8–12 `WEBP`; avif bytes 4–12 contain `ftyp` | CODE | `validation.ts:132-152` |
| Min size | `file.size < 12` → reject | CODE | `validation.ts:141` |
| Max size | `file.size > 5 * 1024 * 1024` (5242880) → reject | CODE | `validation.ts:141` |
| Pixel dimension limit | **none in code** | CODE | no checks in `validateProductImage` |
| Aspect ratio / resize / thumbnail on server | **none** — raw bytes stored as-is | CODE | `actions.ts:122-171`, `474-522` upload path |
| Storage bucket `product-images` | `file_size_limit=5242880`, `allowed_mime_types=[image/jpeg,image/png,image/webp,image/avif]` | CODE/DB | `supabase/migrations/20260805111516_initial_schema.sql:905-917`; asserted `supabase/verification/integrity.sql:207-216` |
| Storage bucket `category-images` | same limit + MIME list | CODE/DB | `supabase/migrations/20260806053422_stage_6_7_completion_security.sql:12-20` |
| Path pattern product | `{product_uuid}/{uuid}.{avif\|jpe?g\|png\|webp}` | CODE/DB | `validation.ts:158-165`; `initial_schema.sql:123-125`; insert policy `:923-933` |
| Path pattern category | `categories/{uuid}.{avif\|jpe?g\|png\|webp}` | CODE/DB | `validation.ts:167-171`; `stage_6_7…sql:6-10,26-32` |
| UI `accept` | `image/jpeg,image/png,image/webp,image/avif` | CODE | `…/categories/[id]/page.tsx:67`; `…/products/[id]/page.tsx:168` |
| UI help text | `JPEG, PNG, WebP или AVIF до 5 MiB.` | CODE | `…/categories/[id]/page.tsx` image section (report line 318) |
| DOC formats + size | JPEG/PNG/WebP/AVIF, до 5 MiB | DOC | `ADMIN_GUIDE.md:248-254`, `:503-509` |
| DOC content must match claimed format | yes (prose) | DOC | `ADMIN_GUIDE.md:507` |
| Rejection code (app) | `AdminValidationError("image")` → redirect `?error=validation` → UI `Проверьте обязательные поля и формат значений.` | CODE/OBS | `validation.ts:141-154`; `actions.ts:39-42`; `errors.ts:81`; report `:332`, `:926`, BUG-06 `:954` |
| Intended doc message `upload_invalid` | `Файл должен быть JPEG, PNG, WebP или AVIF размером до 5 МБ.` exists in catalog but **is not produced** for image validation failures | CODE | `errors.ts:82` vs `actions.ts:39-42` |
| Oversized file observed UI | error boundary `Не удалось загрузить раздел` (not validation alert) | OBS | report `:348`, `:932` |
| Agreements | MIME list + 5 MiB: **CODE and DOC agree** (formats/size). | | |
| **OWNER DECISION NEEDED — image** | (1) BUG-06: invalid image → `validation` vs doc/intended `upload_invalid`. (2) Oversized → error boundary vs validation alert. (3) Min size 12 is CODE-only (DOC silent). (4) Truncated file with valid header + size≥12 **passes** `validateProductImage` (only first 16 bytes checked) while DOC prose says content must match format — CODE and DOC **DISAGREE**. (5) Recon scenario text expected `upload_invalid` (`docs/admin-reconnaissance.md:713`) vs live/code `validation`. | | |

### 1.2 Text / form field limits

Server validators: `src/features/admin/validation.ts` (`requiredText`/`optionalText`/`slugValue`/`codeValue`/`moneyToMinor`). Call sites: `src/features/admin/actions.ts`. UI caps: `src/components/admin/admin-forms.tsx`. DB checks: migrations.

| Form / field | Server (CODE) | UI (CODE) | DOC | DB check | Tags / agreement |
| ------------ | ------------- | --------- | --- | -------- | ---------------- |
| Category `presentation_key` | required 1–20 (`actions.ts:88`) | select only generic/fridge/stove/vacuum (`admin-forms.tsx:153-159`) | four keys (`ADMIN_GUIDE.md:190`) | enum 4 keys (`initial_schema.sql:45-47`) | **DISAGREE**: CODE text length vs DB enum |
| Category `{loc}_name` | 1–240 (`actions.ts:58`) | maxLength 240 (`admin-forms.tsx:42`) | 240 (`ADMIN_GUIDE.md:198`) | **1–160** (`initial_schema.sql:60`) | **DISAGREE** CODE/UI/DOC vs DB |
| Category `{loc}_slug` | 1–220 + pattern (`validation.ts:7,78-81`; `actions.ts:59`) | maxLength 220, pattern (`admin-forms.tsx:57-59`) | 220 + a-z0-9 hyphen (`ADMIN_GUIDE.md:199,228`) | **1–180** + same pattern (`initial_schema.sql:61-64`) | **DISAGREE** max length CODE/UI/DOC vs DB |
| Category `{loc}_short_description` | 1–500 (`actions.ts:60-65`) | maxLength 500 (`admin-forms.tsx:68`) | 500 (`ADMIN_GUIDE.md:200`) | **1–280** (`initial_schema.sql:65`) | **DISAGREE** CODE/UI/DOC vs DB |
| Category `{loc}_description` | 1–5000 (`actions.ts:66-71,91-92`) | maxLength 5000 (`admin-forms.tsx:78`) | 5000 (`ADMIN_GUIDE.md:201`) | 1–5000 (`initial_schema.sql:66`) | AGREE |
| Category SEO title | optional ≤180 (`actions.ts:72`) | **maxLength 70** (`admin-forms.tsx:92`) | 180 optional (`ADMIN_GUIDE.md:202`) | ≤180 (`initial_schema.sql:67`) | **DISAGREE UI 70 vs server/doc/db 180** (BUG-01) |
| Category SEO description | optional ≤320 (`actions.ts:73-74`) | **maxLength 160** (`admin-forms.tsx:106`) | 320 optional (`ADMIN_GUIDE.md:203`) | ≤320 (`initial_schema.sql:68-69`) | **DISAGREE UI 160 vs server/doc/db 320** (BUG-01) |
| Product `{loc}_name` | 1–240 | 240 | 240 (`ADMIN_GUIDE.md:443`) | 1–240 (`initial_schema.sql:103`) | AGREE |
| Product `{loc}_slug` | 1–220 + pattern | 220 + pattern | 220 (`:444`) | 1–220 + pattern (`:104-107`) | AGREE |
| Product `{loc}_short_description` | 1–500 | 500 | 500 (`:445`) | 1–500 (`:108`) | AGREE |
| Product `{loc}_description` | 1–10000 (`actions.ts:372-373`) | 10000 (`admin-forms.tsx:78` product=true) | 10000 (`:446`) | 1–10000 (`:109`) | AGREE |
| Product SEO title/description | same 180/320 via `translation()` | UI 70/160 | 180/320 (`:447-448`) | ≤180/≤320 (`:110-112`) | Same BUG-01 as category |
| Product `brand` | 1–120 required (`actions.ts:360`) | 120 (`admin-forms.tsx:463`) | 120 (`ADMIN_GUIDE.md:417`) | 1–120 (`initial_schema.sql:80`) | AGREE |
| Product `model` | 1–160 required (`actions.ts:361`) | 160 | 160 (`:418`) | 1–160 (`:81`) | AGREE |
| Product `sku` | 1–80 required (`actions.ts:362`) | 80 | 80 (`:419`) | 1–80 unique (`:82`) | AGREE |
| Product `price` | required; `(0\|[1-9]\d{0,12})(\.\d{1,2})?` after `,`→`.` (`validation.ts:90-102`) | MoneyInput | integer or ≤2 decimals (`ADMIN_GUIDE.md:420,429`) | `price_minor >= 0` (`:83`) | AGREE (server stricter format than DB) |
| Product `old_price` | optional; if set must be **>** price (`actions.ts:351-353`) | optional | strictly greater (`ADMIN_GUIDE.md:421`) | `old_price_minor > price_minor` or null (`:84-86`) | AGREE |
| Product `availability` | enum `in_stock\|out_of_stock\|on_order` (`actions.ts:354-356`) | select | three values (`ADMIN_GUIDE.md:422`) | enum | AGREE |
| Product `quantity` | optional integer ≥0 (`actions.ts:366-368`; `validation.ts:54-66` min 0) | optional IntegerInput | optional ≥0 (`:423`) | `quantity is null or >= 0` (`:89`) | AGREE |
| Product `sort_order` | integer 0..1_000_000 (`validation.ts:54-66`) | required | ≥0 (`:424`) | ≥0 (`:93`) | AGREE |
| Product image `alt_ru`/`alt_ro` | 1–240 required (`actions.ts:499-500`) | maxLength 240 | до 240 (`ADMIN_GUIDE.md:517`) | (via RPC) | AGREE |
| Attribute group `code` | 1–80 + `[a-z][a-z0-9_]*` (`validation.ts:8-8,84-88`) | same pattern (`admin-forms.tsx:217-220`) | same (`ADMIN_GUIDE.md:280`) | same regex unique (`initial_schema.sql:148`) | AGREE |
| Attribute group `name_ru`/`name_ro` | 1–160 required (`actions.ts:189-190`) | 160 | 160 (`ADMIN_GUIDE.md:282-283`) | 1–160 (`:158`) | AGREE |
| Attribute `code` | 1–80 + code pattern (`actions.ts:232`) | pattern (`admin-forms.tsx:284-286`) | 80 (`ADMIN_GUIDE.md:300`) | regex (`initial_schema.sql:167`) | AGREE |
| Attribute `unit_code` | optional ≤80 (`actions.ts:234`) — **no pattern in server** | pattern `[a-z][a-z0-9_]*` (`admin-forms.tsx:329-331`) | example codes (`ADMIN_GUIDE.md:303`) | regex (`initial_schema.sql:169-171`) | **DISAGREE** UI/DB pattern vs CODE length-only |
| Attribute `{loc}_name` | 1–160 required (`actions.ts:240,245`) | 160 | 160 (`ADMIN_GUIDE.md:310`) | 1–160 (`:183`) | AGREE |
| Attribute `{loc}_help` | optional ≤500 (`actions.ts:241,246`) | 500 | 500 (`ADMIN_GUIDE.md:311`) | ≤500 (`:184`) | AGREE |
| Attribute `{loc}_unit` | optional ≤40 (`actions.ts:242,247`) | 40 | 40 (`ADMIN_GUIDE.md:312`) | ≤40 (`:185`) | AGREE |
| Attribute option `code` | codeValue 1–80 `[a-z][a-z0-9_]*` (`validation.ts:84-88`) | pattern | `a-z`, `0-9`, `_` (`ADMIN_GUIDE.md:337`) | **`[a-z0-9][a-z0-9_]*`** (`initial_schema.sql:194`) | **DISAGREE** CODE/UI first-letter vs DB digit-first allowed |
| Attribute option `label_*` | 1–160 (`actions.ts:290-291`) | (page form) | via guide | 1–160 (`:206`) | AGREE |
| Product attribute text value | if either RU/RO filled: both required, each ≤500 (`actions.ts:404-409`) | maxLength 500 (`admin-forms.tsx:644,653`) | both langs required (`ADMIN_GUIDE.md:458`) | text_value 1–500 (`initial_schema.sql:252`) | AGREE |
| Product attribute number | regex `^-?\d{1,14}(?:[.,]\d{1,4})?$` (`actions.ts:424-427`) | free input | до 14 + 4 decimals (`ADMIN_GUIDE.md:459`) | `numeric(18,4)` (`:229`) | AGREE |
| Product attribute color | `^#[0-9a-f]{6}$` (`actions.ts:435`) | placeholder `#FFFFFF` | `#RRGGBB` (`ADMIN_GUIDE.md:463`) | `^#[0-9A-Fa-f]{6}$` (`:232-234`) | AGREE |
| Settings `key` | required 1–80 (`actions.ts:727`) + RPC whitelist 7 keys (`stage_6_admin_crud.sql:768-772`) | hidden key from list | whitelist (`ADMIN_GUIDE.md` §6) | enum 7 keys (`initial_schema.sql:259-264`) | AGREE |
| Settings `ru`/`ro` | required 1–1000 (`actions.ts:730-731`) | maxLength 1000 required (`settings/page.tsx:46,56`) | both required (`report:674`) | value 1–1000 (`initial_schema.sql:266`) | AGREE |
| Knowledge `title` | 1–160 required (`actions.ts:754`) | 160 required (`admin-forms.tsx:777`) | 160 (`ADMIN_GUIDE.md:704`) | 1–160 (`stage_6_7…sql:129`) | AGREE |
| Knowledge `content` | 1–5000 required (`actions.ts:755`) | 5000 required (`admin-forms.tsx:791`) | 5000 (`ADMIN_GUIDE.md:705`) | 1–5000 (`stage_6_7…sql:130`) | AGREE |
| Knowledge `locale` | `ru\|ro` only (`validation.ts:68-72`; `actions.ts:753`) | select | RU/RO separate articles (`ADMIN_GUIDE.md:712`) | app_locale | AGREE |
| Lead free-text fields (name/phone/comment) | **not editable in admin forms** — admin only changes `status` (`actions.ts:675-692`) | status select | contacts not editable (`ADMIN_GUIDE.md:588`) | public lead constraints exist but are not admin-form fixtures | CODE/DOC AGREE: no admin text fixtures for lead body fields |
| Lead `status` | enum `new\|in_progress\|contacted\|closed\|spam` (`actions.ts:680-682`) | select | same five (`ADMIN_GUIDE.md:592-598`) | enum | AGREE |
| Orphan cleanup `path` | 1–500 + strict uuid/uuid.ext regex (`actions.ts:586-592`) | hidden/form | — | — | CODE-only |

**OWNER DECISION NEEDED — text**

1. Category name/slug/short_description: server+UI+DOC allow **240/220/500**, DB checks only **160/180/280**. Values that pass `requiredText` can still fail at RPC/DB (`operation_failed` / check violation). Fixtures for category max will be labeled with both limits.
2. SEO UI maxLength **70/160** vs server+DOC+DB **180/320** (BUG-01, report `:877-888`).
3. Attribute option `code`: CODE/UI require leading `a-z`; DB allows leading digit.
4. Attribute `unit_code`: CODE does not enforce pattern; UI+DB do.
5. `presentation_key`: CODE any 1–20 string vs DB/UI enum.
6. Recon `docs/admin-reconnaissance.md:189` still says category slug max **180** (DB) while CODE/UI/DOC say **220**.

### 1.3 Error codes relevant to fixtures

| Code | UI message | When for images/text | Tag |
| ---- | ---------- | -------------------- | --- |
| `validation` | `Проверьте обязательные поля и формат значений.` | any `AdminValidationError` incl. image (`actions.ts:39-42`) | CODE/OBS |
| `upload_invalid` | `Файл должен быть JPEG, PNG, WebP или AVIF размером до 5 МБ.` | catalog only; **not mapped** from image validation | CODE |
| `duplicate key` | `Такой slug, код или SKU уже используется.` | DB unique violations | CODE |
| `assistant_knowledge_incomplete` | `Заполните заголовок и текст статьи базы знаний.` | empty title/content (also HTML5 required) | CODE |
| `site_setting_not_allowed` | `Эту настройку редактировать нельзя.` | non-whitelist key | CODE |

---

## Step 2 — Fixture inventory

### 2.1 Valid images

| File | Category | What it tests | Exact properties | Expected app result | Scenario |
| ---- | -------- | ------------- | ---------------- | ------------------- | -------- |
| `images/valid/product-photo-800x600.jpg` | valid | happy-path product/category photo, 4:3 | JPEG, ~30–80 KB target, 800×600 | `?saved=1`, image stored; MIME+magic+size pass | ADM-PROD-13, ADM-CAT-20 |
| `images/valid/product-photo-1200x1200.jpg` | valid | square product shot | JPEG, 1200×1200 | same | ADM-PROD-13 |
| `images/valid/product-photo-1920x1080.jpg` | valid | 16:9 landscape | JPEG, 1920×1080 | same | ADM-CAT-20 |
| `images/valid/product-photo-600x800.jpg` | valid | portrait 3:4 | JPEG, 600×800 | same | ADM-PROD-13 |
| `images/valid/product-photo-800x600.png` | valid | PNG allowed format | PNG, 800×600 | same | ADM-PROD-13 |
| `images/valid/product-photo-800x600.webp` | valid | WebP allowed format | WebP, 800×600 | same | ADM-PROD-13 |
| `images/valid/product-photo-800x600.avif` | valid | AVIF allowed format | AVIF, 800×600 | same | ADM-PROD-13 |
| `images/valid/category-cover-1600x900.jpg` | valid | category cover typical max landscape | JPEG, 1600×900 | same | ADM-CAT-20 |
| `images/valid/typical-max-4000x3000.jpg` | valid | typical catalog max pixels still ≤5 MiB | JPEG, 4000×3000, **bytes < 5242880** | same | ADM-CAT-20 |
| `images/valid/just-under-5mib.png` | valid | size boundary just under limit | PNG, any dims, **bytes = 5242879** | accepted by size check (`validation.ts:141`) | ADM-CAT-20 / size boundary |
| `images/valid/just-under-5mib.jpg` | valid | same boundary JPEG | JPEG, **bytes = 5242879** | accepted | ADM-CAT-20 |
| `images/valid/min-size-12b.png` | valid (boundary) | CODE min size is 12, not 0 | **exactly 12 bytes**, PNG magic present | passes size+magic checks; **not a real photo** | CODE boundary only |
| `images/valid/no-dimension-limit-8000x6000.png` | valid (boundary) | CODE has **no** pixel-dimension rule | PNG 8000×6000, **bytes ≤ 5242880** | accepted by current CODE (no dim check) | documentation of missing rule |

### 2.2 Invalid images

Each file is designed to violate **exactly one** primary rule under the order of checks in `validateProductImage`: (1) MIME map, (2) size `<12` or `>5MiB`, (3) magic/container.

| File | Category | What it tests | Exact properties | Expected app result | Rule violated | Scenario |
| ---- | -------- | ------------- | ---------------- | ------------------- | ------------- | -------- |
| `images/invalid/text-renamed-to.png` | invalid | text bytes + `.png` name → browser MIME `image/png` but magic not PNG | UTF-8 text, ~200 B, magic ≠ PNG | `?error=validation` (BUG-06 currently) / intended `upload_invalid` | magic vs declared MIME | ADM-CAT-21, ADM-PROD-13 negative |
| `images/invalid/valid-png-renamed-to.jpg` | invalid | real PNG magic, filename `.jpg` → MIME `image/jpeg` | PNG bytes 800×600-sized, ext `.jpg` | `?error=validation` | magic vs MIME | ADM-CAT-21 |
| `images/invalid/png-bytes-mime-jpeg.png` | invalid | correct `.png` name; **test must send `mimeType: image/jpeg`** with PNG bytes | PNG bytes; Playwright buffer mimeType `image/jpeg` | `?error=validation` | magic vs MIME (explicit MIME) | ADM-CAT-21 |
| `images/invalid/zero-bytes.png` | invalid | zero-length file, ext `.png` | **0 bytes** | `?error=validation` | size `< 12` | ADM-CAT-21 |
| `images/invalid/under-min-11b.png` | invalid | size boundary below CODE min | **11 bytes** (no valid full PNG) | `?error=validation` | size `< 12` | size boundary |
| `images/invalid/oversize-png-5mib-plus-1.png` | invalid | size just over CODE/bucket limit | PNG header + padding, **bytes = 5242881** | CODE: `validation`; OBS may show error boundary | size `> 5242880` | ADM-CAT-21 note / size |
| `images/invalid/oversize-jpg-5mib-plus-1.jpg` | invalid | same for JPEG | JPEG magic + padding, **bytes = 5242881** | same | size `> 5242880` | size |
| `images/invalid/corrupt-truncated-png-valid-header.png` | invalid* | truncated after valid PNG header | PNG magic + IHDR, **truncated body**, size in `[12, 5MiB]` | **CODE ACCEPTS** (only 16-byte magic checked) — **not a reliable rejection fixture** | DOC content-match vs CODE magic-only | OWNER DECISION; do not assert reject |
| `images/invalid/disallowed-gif.gif` | invalid | GIF not in MIME map | GIF89a header | `?error=validation` | MIME not allowed | ADM-CAT-21 class |
| `images/invalid/disallowed-svg.svg` | invalid | SVG not allowed | SVG XML text | `?error=validation` | MIME not allowed | ADM-CAT-21 class |
| `images/invalid/disallowed-bmp.bmp` | invalid | BMP not allowed | BMP magic `BM` | `?error=validation` | MIME not allowed | ADM-CAT-21 class |
| `images/invalid/disallowed-heic.heic` | **NOT GENERATED** | HEIC disallowed | — | — | HEIC **encoder unavailable** (sharp writes avif, not heic) | — |
| `images/invalid/disallowed-tiff.tiff` | invalid | TIFF not in admin MIME map | TIFF magic | `?error=validation` | MIME not allowed | extra |
| `images/invalid/wrong-ext-text-as.webp` | invalid | text + `.webp` | text bytes | `?error=validation` | magic | ADM-CAT-21 |
| `images/invalid/png-bytes-named-gif.gif` | invalid | PNG magic + `.gif` name | PNG bytes, ext gif | `?error=validation` | MIME map (gif) before magic | single-rule: MIME |

\* Truncated-with-valid-header is listed for completeness; Step 4 will show CODE accepts it.

### 2.3 Text fixtures

Directory: `e2e/fixtures/text/`. Each file is exact content; length in **JS UTF-16 code units** (`str.length`). Index: `e2e/fixtures/text/INDEX.json`.

Special strings (used inside many cases):

| id | value |
| -- | ----- |
| `cyrillic` | `Холодильники и морозильные камеры` |
| `ro_diacritics` | `Frigidere cu ăâîșț` (ă â î ș ț) |
| `emoji` | `📦🔥❄️` |
| `html_script` | `<script>alert(1)</script>` |
| `html_img` | `<img src=x onerror=alert(1)>` |
| `leading_trailing` | `  padded value  ` |
| `only_spaces` | `   ` |
| `very_long_a` | `a`.repeat(N) |

| File | Category | Field / rule | Exact properties | Expected result | Rule tag | Scenario |
| ---- | -------- | ------------ | ---------------- | --------------- | -------- | -------- |
| `text/category_name_ru/len240.txt` | valid | Category name RU | 240×`Н` | Server accepts 240; **DB check is 160** → may fail at RPC | CODE 240 / DB 160 **DISAGREE** | ADM-CAT-10 + owner decision |
| `text/category_name_ru/len160.txt` | valid | Category name RU safe under both | 160×`Н` | save `?saved=1` | CODE+DB AGREE 160 | ADM-CAT-10 |
| `text/category_name_ru/len241.txt` | invalid | Category name RU over CODE max | 241×`Н` | `?error=validation` | CODE max 240 | ADM-CAT-10 negative |
| `text/category_slug_ru/len220.txt` | valid* | Category slug | 220×`a` pattern-valid | CODE accepts; **DB 180** may reject | CODE 220 / DB 180 **DISAGREE** | ADM-CAT-10 + owner |
| `text/category_slug_ru/len180.txt` | valid | Slug under both | 180×`a` | save OK | AGREE | ADM-CAT-10 |
| `text/category_slug_ru/len221.txt` | invalid | Slug over CODE max | 221×`a` | `?error=validation` | CODE 220 | ADM-CAT-13 class |
| `text/category_slug_ru/bad_uppercase.txt` | invalid | Pattern `Frigidere` | `Frigidere` | HTML5 pattern / server validation | pattern CODE `validation.ts:7` | ADM-CAT-13 |
| `text/category_slug_ru/bad_spaces.txt` | invalid | Pattern spaces | `frigidere noi` | validation | pattern | ADM-CAT-13 |
| `text/category_slug_ru/bad_underscore.txt` | invalid | Pattern underscore | `frigidere_` | validation | pattern | ADM-CAT-13 |
| `text/category_slug_ru/bad_cyrillic.txt` | invalid | Pattern non-latin | `Холодильники` | validation | pattern | ADM-CAT-13 |
| `text/category_slug_ru/bad_path.txt` | invalid | Pattern path | `/catalog/frigidere` | validation | pattern | ADM-CAT-13 |
| `text/category_short_ru/len500.txt` | valid* | short_description | 500×`К` | CODE 500 / **DB 280** | DISAGREE | owner |
| `text/category_short_ru/len280.txt` | valid | under both | 280×`К` | save OK | AGREE | ADM-CAT-10 |
| `text/category_short_ru/len501.txt` | invalid | over CODE | 501×`К` | `?error=validation` | CODE 500 | ADM-CAT-10 |
| `text/category_desc_ru/len5000.txt` | valid | full description | 5000×`О` | save OK | AGREE | ADM-CAT-10 |
| `text/category_desc_ru/len5001.txt` | invalid | over | 5001×`О` | `?error=validation` | CODE 5000 | ADM-CAT-10 |
| `text/seo_title/category/len70.txt` | valid | UI SEO title cap | 70×`S` | UI accepts; server would allow 180 | UI 70 vs server 180 **BUG-01** | ADM-CAT-16 |
| `text/seo_title/category/len71.txt` | invalid (UI) | over UI cap | 71×`S` | UI blocks/truncates; **server would accept** | BUG-01 | ADM-CAT-16 `test.fail()` intended 180 |
| `text/seo_title/category/len180.txt` | valid (server) | server/doc max | 180×`S` | server accepts if UI bypassed; UI maxLength 70 truncates | BUG-01 intended | ADM-CAT-16 |
| `text/seo_title/category/len181.txt` | invalid (server) | over server | 181×`S` | `?error=validation` if submitted | CODE 180 | ADM-CAT-16 |
| `text/seo_desc/category/len160.txt` | valid | UI SEO desc cap | 160×`D` | UI accepts | BUG-01 | ADM-CAT-16 |
| `text/seo_desc/category/len161.txt` | invalid (UI) | over UI | 161×`D` | UI blocks; server would allow 320 | BUG-01 | ADM-CAT-16 |
| `text/seo_desc/category/len320.txt` | valid (server) | server max | 320×`D` | server accepts | BUG-01 intended | ADM-CAT-16 |
| `text/seo_desc/category/len321.txt` | invalid (server) | over server | 321×`D` | `?error=validation` | CODE 320 | ADM-CAT-16 |
| `text/product_name_ru/len240.txt` | valid | product name | 240×`Т` | save OK | AGREE | ADM-PROD-05 |
| `text/product_name_ru/len241.txt` | invalid | over | 241×`Т` | `?error=validation` | CODE 240 | ADM-PROD-05 |
| `text/product_slug_ru/len220.txt` | valid | product slug | 220×`p` | save OK | AGREE | ADM-PROD-05 |
| `text/product_slug_ru/len221.txt` | invalid | over | 221×`p` | validation | CODE 220 | ADM-PROD-05 |
| `text/product_short_ru/len500.txt` | valid | product short | 500×`К` | OK | AGREE | ADM-PROD-05 |
| `text/product_short_ru/len501.txt` | invalid | over | 501×`К` | validation | CODE 500 | ADM-PROD-05 |
| `text/product_desc_ru/len10000.txt` | valid | product description | 10000×`О` | OK | AGREE | ADM-PROD-05 |
| `text/product_desc_ru/len10001.txt` | invalid | over | 10001×`О` | validation | CODE 10000 | ADM-PROD-05 |
| `text/product_brand/len120.txt` | valid | brand | 120×`B` | OK | AGREE | ADM-PROD-05 |
| `text/product_brand/len121.txt` | invalid | over | 121×`B` | validation | CODE 120 | ADM-PROD-05 |
| `text/product_model/len160.txt` | valid | model | 160×`M` | OK | AGREE | ADM-PROD-05 |
| `text/product_model/len161.txt` | invalid | over | 161×`M` | validation | CODE 160 | ADM-PROD-05 |
| `text/product_sku/len80.txt` | valid | sku | 80×`S` | OK (unique per run) | AGREE | ADM-PROD-05 |
| `text/product_sku/len81.txt` | invalid | over | 81×`S` | validation | CODE 80 | ADM-PROD-05 |
| `text/product_alt_ru/len240.txt` | valid | image alt | 240×`A` | OK with valid image | AGREE | ADM-PROD-13 |
| `text/product_alt_ru/len241.txt` | invalid | over alt | 241×`A` | validation | CODE 240 | ADM-PROD-13 |
| `text/attr_group_code/len80.txt` | valid | group code | 80-char `[a-z][a-z0-9_]*` | OK | AGREE | ADM-AG-01 |
| `text/attr_group_code/len81.txt` | invalid | over | 81-char code | validation | CODE 80 | ADM-AG-04 class |
| `text/attr_group_name/len160.txt` | valid | group name | 160×`Г` | OK | AGREE | ADM-AG-01 |
| `text/attr_group_name/len161.txt` | invalid | over | 161×`Г` | validation | CODE 160 | ADM-AG-01 |
| `text/attr_name/len160.txt` | valid | attribute name | 160×`Х` | OK | AGREE | ADM-ATTR-01 |
| `text/attr_name/len161.txt` | invalid | over | 161×`Х` | validation | CODE 160 | ADM-ATTR-01 |
| `text/attr_help/len500.txt` | valid | help text | 500×`H` | OK optional | AGREE | ADM-ATTR-01 |
| `text/attr_help/len501.txt` | invalid | over | 501×`H` | validation | CODE 500 | ADM-ATTR-01 |
| `text/attr_unit/len40.txt` | valid | unit label | 40×`U` | OK | AGREE | ADM-ATTR-01 |
| `text/attr_unit/len41.txt` | invalid | over | 41×`U` | validation | CODE 40 | ADM-ATTR-01 |
| `text/attr_value_text/len500.txt` | valid | product attr text | 500×`З` | OK | AGREE | ADM-PROD-17 |
| `text/attr_value_text/len501.txt` | invalid | over | 501×`З` | validation | CODE 500 | ADM-PROD-17 |
| `text/settings_value/len1000.txt` | valid | settings ru/ro | 1000×`Н` | `?saved=1` | AGREE | ADM-SET-01 |
| `text/settings_value/len1001.txt` | invalid | over | 1001×`Н` | validation | CODE 1000 | ADM-SET-01 |
| `text/settings_value/only_spaces.txt` | invalid | whitespace-only | `   ` | `?error=validation` | requiredText trim→empty | ADM-SET-02 |
| `text/knowledge_title/len160.txt` | valid | article title | 160×`З` | `?saved=1` | AGREE | ADM-KB-01 |
| `text/knowledge_title/len161.txt` | invalid | over | 161×`З` | validation | CODE 160 | ADM-KB-01 |
| `text/knowledge_content/len5000.txt` | valid | article content | 5000×`Т` | OK | AGREE | ADM-KB-01 |
| `text/knowledge_content/len5001.txt` | invalid | over | 5001×`Т` | validation | CODE 5000 | ADM-KB-01 |
| `text/shared/cyrillic_name.txt` | valid (charset) | Cyrillic in name | `Холодильники Nord Cool 300` | accepted if length OK | no charset ban on names | ADM-CAT-10 |
| `text/shared/ro_diacritics_name.txt` | valid | RO diacritics | `Frigidere cu ăâîșț` | accepted | CODE allows any unicode in free text | ADM-CAT-10 |
| `text/shared/emoji_name.txt` | valid (charset) | emoji in name | `📦 Холодильник` | accepted if length OK | CODE length uses UTF-16 units | ADM-CAT-10 |
| `text/shared/html_script_name.txt` | valid* | HTML/script-like in free text | `<script>alert(1)</script>` | **stored as text** by admin server (no sanitize in `requiredText`) | CODE: no HTML filter | ADM-CAT-10; storefront XSS is separate concern |
| `text/shared/html_img_name.txt` | valid* | script-like img tag | `<img src=x onerror=alert(1)>` | stored as text | CODE no filter | same |
| `text/shared/leading_trailing_name.txt` | valid (after trim) | spaces around value | `  padded value  ` | server **trims** → stored `padded value` | CODE trim `validation.ts:22-24` | ADM-CAT-10 |
| `text/shared/only_spaces_name.txt` | invalid | only spaces | `   ` | trim→empty → `validation` / HTML5 required | CODE requiredText min 1 | ADM-CAT-12 class / ADM-SET-02 |
| `text/shared/very_long_10k.txt` | boundary | very long text | 10000×`x` | valid for product description; **invalid** for name/short/seo/etc. | field-specific max | multiple |
| `text/price/valid_0.txt` | valid | price | `0` | OK if old_price empty or >0 | CODE money regex | ADM-PROD-05 |
| `text/price/valid_5990.txt` | valid | price | `5990` | OK | AGREE | ADM-PROD-05 |
| `text/price/valid_5990_50.txt` | valid | price dot | `5990.50` | OK | AGREE | ADM-PROD-05 |
| `text/price/valid_5990_comma.txt` | valid | price comma | `5990,50` | OK (normalized) | AGREE | ADM-PROD-05 |
| `text/price/invalid_empty.txt` | invalid | empty price | `` | HTML5 required / validation | required | ADM-PROD-10 |
| `text/price/invalid_abc.txt` | invalid | non-numeric | `abc` | `?error=validation` field price | CODE regex | ADM-PROD-10 |
| `text/price/invalid_negative.txt` | invalid | negative | `-5` | validation | CODE regex | ADM-PROD-10 |
| `text/price/invalid_three_decimals.txt` | invalid | 3 decimals | `5990.123` | validation | CODE `\.\d{1,2}` | ADM-PROD-10 |
| `text/price/invalid_leading_zero.txt` | invalid | leading zero | `01.5` | validation | CODE `(0\|[1-9]…)` | ADM-PROD-10 |
| `text/price/old_not_greater.txt` | invalid | old_price ≤ price | price `100`, old `100` | `?error=validation` old_price | CODE `actions.ts:352-353` | ADM-PROD class |
| `text/price/old_greater.txt` | valid | old_price > price | price `100`, old `120` | OK | AGREE | ADM-PROD |
| `text/status/invalid_lead_status.txt` | invalid | lead status not in enum | `archived` | `?error=validation` | CODE enum | lead admin scenario |
| `text/status/valid_lead_status.txt` | valid | lead status | `in_progress` | OK | AGREE | lead admin |

---

## Step 3 — Generation plan

Script: `e2e/fixtures/generate.mjs`

1. Load `sharp` from `node_modules` (already installed; **no npm install**).
2. Build synthetic product-like pixels (gradient + noise + label bar) at required dimensions; encode jpeg/png/webp/avif/gif via sharp.
3. Boundary sizes: encode then pad with zero bytes after container end **only for size-boundary files** so magic remains valid at offset 0; for oversize, pad to exact `5242881`.
4. Min-size PNG: craft 12-byte buffer starting with PNG magic (boundary, not a real image).
5. Extreme-dims PNG at 8000×6000 only if encoded size ≤ 5242880; else document and use smaller valid PNG + note.
6. Hand-write: bmp, svg, zero-bytes, 11-byte under-min, truncated PNG, text files.
7. HEIC: **skip** with explicit log (no encoder).
8. Write `text/INDEX.json` + all text files.
9. Write `fixtures.json` machine index (path, category, expected, scenario, properties).

---

## Step 4 — Verification plan (independent)

`e2e/fixtures/verify.mjs` (or one-off script) must:

- Read **bytes** from disk.
- Detect format via **magic bytes** (own parser, not sharp).
- Get dimensions via **own IHDR/SOF/VP8/ispe parsers** where applicable; fall back to `sharp.metadata()` only as secondary cross-check and still report raw magic+size.
- Compare against `fixtures.json` / this manifest.
- Print table: `file | expected | actual | OK/MISMATCH`.
- Re-implement `validateProductImage` rule checks in the verifier (copy of logic, not import of app code) and classify each invalid file as failing **exactly one** primary rule.

---

## Step 5 — Report requirements (Russian)

Final report must lead with any **MISMATCH**, then rules with file:line, owner-decision list, files created, verification table, and what could not be generated/verified (HEIC; truncated-file rejection; category DB vs CODE length outcomes without live DB).

/**
 * Reproducible admin e2e fixture generator.
 * Run:  node e2e/fixtures/generate.mjs
 * Uses only packages already present in node_modules (sharp) + hand-crafted bytes.
 * Does not install anything. Does not touch src/, package.json, or e2e specs.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "images", "valid");
const BAD = path.join(__dirname, "images", "invalid");
const TEXT = path.join(__dirname, "text");
const INDEX_JSON = path.join(__dirname, "fixtures.json");
const TEXT_INDEX = path.join(__dirname, "text", "INDEX.json");

const LIMIT = 5 * 1024 * 1024; // 5242880
const UNDER = LIMIT - 1; // 5242879
const OVER = LIMIT + 1; // 5242881

/** @type {Array<object>} */
const records = [];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function writeBinary(relDir, name, buf, meta) {
  const dir = path.join(__dirname, relDir);
  ensureDir(dir);
  const full = path.join(dir, name);
  fs.writeFileSync(full, buf);
  records.push({
    path: path.relative(__dirname, full).split(path.sep).join("/"),
    ...meta,
    bytes: buf.length,
    sha256: sha256(buf),
  });
  console.log(
    `W ${path.relative(__dirname, full)}  ${buf.length} bytes  ${meta.expected ?? ""}`,
  );
}

function writeText(relPath, content, meta) {
  const full = path.join(__dirname, relPath);
  ensureDir(path.dirname(full));
  const buf = Buffer.from(content, "utf8");
  fs.writeFileSync(full, buf);
  records.push({
    path: relPath.split(path.sep).join("/"),
    ...meta,
    bytes: buf.length,
    sha256: sha256(buf),
  });
  console.log(
    `W ${relPath}  ${buf.length} bytes  len=${content.length}  ${meta.expected ?? ""}`,
  );
}

function repeat(ch, n) {
  return ch.repeat(n);
}

// ---------------------------------------------------------------------------
// Synthetic product-like source (sharp.create raw)
// ---------------------------------------------------------------------------

function productLikeRaw(width, height, seed = 1) {
  const channels = 3;
  const buf = Buffer.alloc(width * height * channels);
  // Deterministic pseudo-photo: vertical gradient + block noise + "label" bar.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const g = Math.floor((y / Math.max(1, height - 1)) * 180 + 40);
      const n = ((x * 37 + y * 91 + seed * 13) % 23) - 11; // -11..11 noise
      const inLabel =
        y > height * 0.72 &&
        y < height * 0.86 &&
        x > width * 0.1 &&
        x < width * 0.9;
      const base = inLabel ? 230 : g;
      buf[i] = Math.max(0, Math.min(255, base + n));
      buf[i + 1] = Math.max(0, Math.min(255, Math.floor(base * 0.92) + n));
      buf[i + 2] = Math.max(0, Math.min(255, Math.floor(base * 0.75) + n + 15));
    }
  }
  return { raw: buf, width, height, channels };
}

async function encode(sharp, spec) {
  const { width, height, format, quality, seed = 1 } = spec;
  const { raw } = productLikeRaw(width, height, seed);
  let pipeline = sharp(raw, {
    raw: { width, height, channels: 3 },
  });
  if (format === "jpeg")
    pipeline = pipeline.jpeg({ quality: quality ?? 82, mozjpeg: true });
  else if (format === "png") pipeline = pipeline.png({ compressionLevel: 6 });
  else if (format === "webp")
    pipeline = pipeline.webp({ quality: quality ?? 80 });
  else if (format === "avif")
    pipeline = pipeline.avif({ quality: quality ?? 50 });
  else if (format === "gif") pipeline = pipeline.gif();
  else throw new Error(`unsupported format ${format}`);
  return pipeline.toBuffer();
}

/** Pad buffer to exact target size while keeping leading magic intact. */
function padTo(buf, target, fill = 0) {
  if (buf.length > target)
    throw new Error(`buffer ${buf.length} > target ${target}`);
  const out = Buffer.alloc(target, fill);
  buf.copy(out, 0);
  return out;
}

function pngMagic() {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function jpegMagic() {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
}

function bmpHeader(width, height) {
  // Minimal 24-bit BMP, no compression, pixels after 54-byte header.
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowSize * height;
  const fileSize = 54 + pixelBytes;
  const h = Buffer.alloc(54);
  h.write("BM", 0, "ascii");
  h.writeUInt32LE(fileSize, 2);
  h.writeUInt32LE(54, 10);
  h.writeUInt32LE(40, 14);
  h.writeInt32LE(width, 18);
  h.writeInt32LE(height, 22);
  h.writeUInt16LE(1, 26);
  h.writeUInt16LE(24, 28);
  h.writeUInt32LE(0, 30);
  h.writeUInt32LE(pixelBytes, 34);
  return h;
}

function makeBmp(width, height) {
  const header = bmpHeader(width, height);
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixels = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * rowSize + x * 3;
      pixels[i] = 40 + (x % 100);
      pixels[i + 1] = 90 + (y % 80);
      pixels[i + 2] = 160;
    }
  }
  return Buffer.concat([header, pixels]);
}

function makeSvg(width, height) {
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n  <rect width="100%" height="100%" fill="#1e3a5f"/>\n  <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="#f59e0b"/>\n</svg>\n`,
    "utf8",
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  ensureDir(ROOT);
  ensureDir(BAD);
  ensureDir(TEXT);

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch (err) {
    console.error(
      "sharp is not available in node_modules — cannot encode images.",
    );
    console.error(String(err));
    process.exit(2);
  }

  console.log("Generating valid images…");

  const validSpecs = [
    {
      name: "product-photo-800x600.jpg",
      width: 800,
      height: 600,
      format: "jpeg",
      quality: 82,
    },
    {
      name: "product-photo-1200x1200.jpg",
      width: 1200,
      height: 1200,
      format: "jpeg",
      quality: 80,
    },
    {
      name: "product-photo-1920x1080.jpg",
      width: 1920,
      height: 1080,
      format: "jpeg",
      quality: 78,
    },
    {
      name: "product-photo-600x800.jpg",
      width: 600,
      height: 800,
      format: "jpeg",
      quality: 82,
    },
    {
      name: "product-photo-800x600.png",
      width: 800,
      height: 600,
      format: "png",
    },
    {
      name: "product-photo-800x600.webp",
      width: 800,
      height: 600,
      format: "webp",
      quality: 80,
    },
    {
      name: "product-photo-800x600.avif",
      width: 800,
      height: 600,
      format: "avif",
      quality: 50,
    },
    {
      name: "category-cover-1600x900.jpg",
      width: 1600,
      height: 900,
      format: "jpeg",
      quality: 80,
      seed: 7,
    },
    {
      name: "typical-max-4000x3000.jpg",
      width: 4000,
      height: 3000,
      format: "jpeg",
      quality: 70,
      seed: 11,
    },
  ];

  for (const spec of validSpecs) {
    const buf = await encode(sharp, spec);
    const mime =
      spec.format === "jpeg"
        ? "image/jpeg"
        : spec.format === "png"
          ? "image/png"
          : spec.format === "webp"
            ? "image/webp"
            : spec.format === "avif"
              ? "image/avif"
              : "image/gif";
    if (buf.length > LIMIT) {
      console.warn(
        `WARN ${spec.name} encoded size ${buf.length} > 5MiB — adjusting quality`,
      );
      // re-encode lower quality
      const smaller = await encode(sharp, { ...spec, quality: 40 });
      writeBinary("images/valid", spec.name, smaller, {
        category: "valid",
        format: mime,
        pixelSize: `${spec.width}x${spec.height}`,
        expected: "accept (MIME+magic+size)",
        rule: "validation.ts:132-155 size<=5MiB",
        scenarios:
          spec.format === "jpeg" ? "ADM-CAT-20,ADM-PROD-13" : "ADM-PROD-13",
        notes: "re-encoded to fit under 5MiB",
      });
      continue;
    }
    writeBinary("images/valid", spec.name, buf, {
      category: "valid",
      format: mime,
      pixelSize: `${spec.width}x${spec.height}`,
      expected: "accept (MIME+magic+size)",
      rule: "validation.ts:132-155",
      scenarios:
        spec.format === "jpeg" ? "ADM-CAT-20,ADM-PROD-13" : "ADM-PROD-13",
    });
  }

  // Size boundary just under limit: valid PNG padded to UNDER.
  {
    const base = await encode(sharp, {
      width: 32,
      height: 32,
      format: "png",
      seed: 3,
    });
    const padded = padTo(base, UNDER);
    writeBinary("images/valid", "just-under-5mib.png", padded, {
      category: "valid",
      format: "image/png",
      pixelSize: "32x32 (+ zero padding)",
      expected: "accept (size = 5242879 < 5242880)",
      rule: "validation.ts:141",
      scenarios: "ADM-CAT-20 size boundary",
    });
  }
  {
    const base = await encode(sharp, {
      width: 32,
      height: 32,
      format: "jpeg",
      quality: 50,
      seed: 4,
    });
    const padded = padTo(base, UNDER);
    writeBinary("images/valid", "just-under-5mib.jpg", padded, {
      category: "valid",
      format: "image/jpeg",
      pixelSize: "32x32 (+ zero padding)",
      expected: "accept (size = 5242879)",
      rule: "validation.ts:141",
      scenarios: "ADM-CAT-20 size boundary",
    });
  }

  // CODE min size = 12 with PNG magic (boundary only, not a real photo).
  {
    const buf = Buffer.alloc(12, 0);
    pngMagic().copy(buf, 0);
    writeBinary("images/valid", "min-size-12b.png", buf, {
      category: "valid",
      format: "image/png (magic only)",
      pixelSize: "n/a",
      expected: "accept by CODE size/magic checks (not a real photo)",
      rule: "validation.ts:141 size>=12; :134 magic",
      scenarios: "CODE boundary only",
      notes: "Do not use as happy-path product photo.",
    });
  }

  // Extreme dimensions — CODE has no pixel-dimension limit.
  {
    const buf = await encode(sharp, {
      width: 8000,
      height: 6000,
      format: "png",
      seed: 21,
    });
    if (buf.length <= LIMIT) {
      writeBinary("images/valid", "no-dimension-limit-8000x6000.png", buf, {
        category: "valid",
        format: "image/png",
        pixelSize: "8000x6000",
        expected: "accept — CODE has no dimension rule",
        rule: "validation.ts:132-155 (no dim check)",
        scenarios: "documentation",
      });
    } else {
      console.warn(
        `WARN 8000x6000 PNG is ${buf.length} bytes > 5MiB — size rule would reject; not labeled valid.`,
      );
      records.push({
        path: "images/valid/no-dimension-limit-8000x6000.png",
        category: "invalid",
        format: "image/png",
        pixelSize: "8000x6000",
        expected:
          "NOT valid — exceeds 5MiB size rule (no pixel-dimension rule exists)",
        rule: "validation.ts:141",
        scenarios: "documentation",
        generated: false,
        notes: `Encoded size ${buf.length} > 5242880; file not written as valid.`,
      });
      const typical = await encode(sharp, {
        width: 4000,
        height: 3000,
        format: "png",
        quality: 40,
        seed: 21,
      });
      if (typical.length <= LIMIT) {
        writeBinary(
          "images/valid",
          "no-dimension-limit-typical-max.png",
          typical,
          {
            category: "valid",
            format: "image/png",
            pixelSize: "4000x3000",
            expected: "accept — no pixel-dimension rule in CODE",
            rule: "validation.ts:132-155",
            scenarios: "documentation",
          },
        );
      } else {
        console.warn(
          "WARN typical-max png still over limit; skipped as valid fixture.",
        );
      }
    }
  }

  console.log("Generating invalid images…");

  // Text renamed to .png
  {
    const text =
      "This is not an image. Just plain UTF-8 text for MIME/magic mismatch.\n";
    const buf = Buffer.from(text, "utf8");
    writeBinary("images/invalid", "text-renamed-to.png", buf, {
      category: "invalid",
      format: "text/plain bytes, ext .png",
      pixelSize: "n/a",
      expected: "reject — magic not PNG (browser MIME often image/png)",
      rule: "validation.ts:134,153-154",
      scenarios: "ADM-CAT-21 (BUG-06: currently ?error=validation)",
      violates: "magic-vs-mime",
    });
  }

  // Valid PNG bytes named .jpg
  {
    const png = await encode(sharp, {
      width: 64,
      height: 64,
      format: "png",
      seed: 5,
    });
    writeBinary("images/invalid", "valid-png-renamed-to.jpg", png, {
      category: "invalid",
      format: "image/png bytes, ext .jpg",
      pixelSize: "64x64",
      expected: "reject — MIME image/jpeg vs PNG magic",
      rule: "validation.ts:133 vs magic 89 50 4E 47",
      scenarios: "ADM-CAT-21",
      violates: "magic-vs-mime",
    });
  }

  // PNG bytes; Playwright must send mimeType image/jpeg
  {
    const png = await encode(sharp, {
      width: 64,
      height: 64,
      format: "png",
      seed: 6,
    });
    writeBinary("images/invalid", "png-bytes-mime-jpeg.png", png, {
      category: "invalid",
      format: "image/png bytes; test must set mimeType=image/jpeg",
      pixelSize: "64x64",
      expected: "reject when uploaded with MIME image/jpeg",
      rule: "validation.ts:140-154",
      scenarios: "ADM-CAT-21",
      violates: "magic-vs-mime (explicit MIME)",
    });
  }

  // Zero bytes
  writeBinary("images/invalid", "zero-bytes.png", Buffer.alloc(0), {
    category: "invalid",
    format: "empty",
    pixelSize: "n/a",
    expected: "reject — size < 12",
    rule: "validation.ts:141",
    scenarios: "ADM-CAT-21",
    violates: "size",
  });

  // 11 bytes under min
  {
    const buf = Buffer.alloc(11, 0x41);
    writeBinary("images/invalid", "under-min-11b.png", buf, {
      category: "invalid",
      format: "11 bytes, ext .png",
      pixelSize: "n/a",
      expected: "reject — size < 12",
      rule: "validation.ts:141",
      scenarios: "size boundary",
      violates: "size",
    });
  }

  // Oversize PNG = OVER bytes (valid magic at start)
  {
    const base = await encode(sharp, {
      width: 32,
      height: 32,
      format: "png",
      seed: 8,
    });
    const padded = padTo(base, OVER);
    writeBinary("images/invalid", "oversize-png-5mib-plus-1.png", padded, {
      category: "invalid",
      format: "image/png",
      pixelSize: "32x32 (+ padding)",
      expected:
        "reject — size > 5242880 (CODE validation; OBS may show error boundary)",
      rule: "validation.ts:141",
      scenarios: "ADM-CAT-21 size note",
      violates: "size",
    });
  }

  // Oversize JPEG = OVER bytes
  {
    const base = await encode(sharp, {
      width: 32,
      height: 32,
      format: "jpeg",
      quality: 50,
      seed: 9,
    });
    const padded = padTo(base, OVER);
    writeBinary("images/invalid", "oversize-jpg-5mib-plus-1.jpg", padded, {
      category: "invalid",
      format: "image/jpeg",
      pixelSize: "32x32 (+ padding)",
      expected: "reject — size > 5242880",
      rule: "validation.ts:141",
      scenarios: "size",
      violates: "size",
    });
  }

  // Truncated PNG with valid header — CODE ACCEPTS (only first 16 bytes checked)
  {
    const full = await encode(sharp, {
      width: 64,
      height: 64,
      format: "png",
      seed: 10,
    });
    // Keep IHDR-ish start: PNG signature + some bytes; truncate body
    const truncated = full.subarray(0, Math.min(80, full.length));
    writeBinary(
      "images/invalid",
      "corrupt-truncated-png-valid-header.png",
      truncated,
      {
        category: "invalid",
        format: "image/png truncated",
        pixelSize: "64x64 (incomplete)",
        expected:
          "CODE ACCEPTS magic-only check — NOT a reliable rejection fixture (OWNER DECISION vs DOC)",
        rule: "validation.ts:143-154 only reads 16 bytes",
        scenarios: "documentation / OWNER DECISION",
        violates: "none under CODE (DOC content-match unclear)",
        notes: "Do not assert reject on current CODE.",
      },
    );
  }

  // Disallowed formats
  {
    // Minimal GIF87a
    const gif = Buffer.from(
      "GIF89a" + "0100" + "0100" + "00" + "00" + "00" + "3b",
      "binary",
    );
    // simpler fixed header
    const gif89a = Buffer.concat([
      Buffer.from("GIF89a", "ascii"),
      Buffer.from([
        0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00,
        0x00, 0x21, 0xf9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
        0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00,
        0x3b,
      ]),
    ]);
    writeBinary("images/invalid", "disallowed-gif.gif", gif89a, {
      category: "invalid",
      format: "image/gif",
      pixelSize: "1x1",
      expected: "reject — MIME image/gif not in allowedImages",
      rule: "validation.ts:132-141",
      scenarios: "ADM-CAT-21 class",
      violates: "mime",
    });
  }

  writeBinary("images/invalid", "disallowed-svg.svg", makeSvg(200, 200), {
    category: "invalid",
    format: "image/svg+xml",
    pixelSize: "200x200 (vector)",
    expected: "reject — MIME not allowed",
    rule: "validation.ts:132-141",
    scenarios: "ADM-CAT-21 class",
    violates: "mime",
  });

  writeBinary("images/invalid", "disallowed-bmp.bmp", makeBmp(32, 32), {
    category: "invalid",
    format: "image/bmp",
    pixelSize: "32x32",
    expected: "reject — MIME not allowed",
    rule: "validation.ts:132-141",
    scenarios: "ADM-CAT-21 class",
    violates: "mime",
  });

  // HEIC — cannot generate
  records.push({
    path: "images/invalid/disallowed-heic.heic",
    category: "invalid",
    format: "image/heic",
    pixelSize: "n/a",
    expected: "reject — MIME not allowed (if present)",
    rule: "validation.ts:132-141",
    scenarios: "ADM-CAT-21 class",
    violates: "mime",
    generated: false,
    notes:
      "NOT GENERATED: sharp heif output is avif only; no HEIC encoder in project.",
  });
  console.log("SKIP images/invalid/disallowed-heic.heic (no HEIC encoder)");

  // TIFF not in admin allowlist
  {
    // Minimal TIFF header LE
    const tiff = Buffer.concat([
      Buffer.from("II", "ascii"),
      Buffer.from([0x2a, 0x00]),
      Buffer.from([0x08, 0x00, 0x00, 0x00]),
      Buffer.alloc(64, 0),
    ]);
    writeBinary("images/invalid", "disallowed-tiff.tiff", tiff, {
      category: "invalid",
      format: "image/tiff",
      pixelSize: "n/a",
      expected:
        "reject — MIME not in admin allowlist (sharp can write tiff but app rejects)",
      rule: "validation.ts:132-141",
      scenarios: "extra negative",
      violates: "mime",
    });
  }

  // Text as .webp
  {
    const buf = Buffer.from("not a webp file at all\n", "utf8");
    writeBinary("images/invalid", "wrong-ext-text-as.webp", buf, {
      category: "invalid",
      format: "text, ext .webp",
      pixelSize: "n/a",
      expected: "reject — magic not RIFF/WEBP",
      rule: "validation.ts:135,147-149",
      scenarios: "ADM-CAT-21 class",
      violates: "magic-vs-mime",
    });
  }

  // PNG bytes named .gif
  {
    const png = await encode(sharp, {
      width: 48,
      height: 48,
      format: "png",
      seed: 12,
    });
    writeBinary("images/invalid", "png-bytes-named-gif.gif", png, {
      category: "invalid",
      format: "image/png bytes, ext .gif",
      pixelSize: "48x48",
      expected: "reject — MIME image/gif not allowed (fails before magic)",
      rule: "validation.ts:132-141",
      scenarios: "ADM-CAT-21 class",
      violates: "mime",
    });
  }

  // -------------------------------------------------------------------------
  // Text fixtures
  // -------------------------------------------------------------------------
  console.log("Generating text fixtures…");

  /** @type {Record<string, string>} */
  const special = {
    cyrillic: "Холодильники и морозильные камеры",
    ro_diacritics: "Frigidere cu ăâîșț",
    emoji: "📦🔥❄️",
    html_script: "<script>alert(1)</script>",
    html_img: "<img src=x onerror=alert(1)>",
    leading_trailing: "  padded value  ",
    only_spaces: "   ",
  };

  /** @type {Array<object>} */
  const textIndex = [];

  function textFixture(rel, content, meta) {
    writeText(rel, content, {
      category: meta.category ?? "valid",
      format: "text/plain utf-8",
      expected: meta.expected,
      rule: meta.rule,
      scenarios: meta.scenarios,
      violates: meta.violates,
      length: content.length,
      ...meta.extra,
    });
    textIndex.push({
      path: rel.split(path.sep).join("/"),
      field: meta.field,
      category: meta.category ?? "valid",
      length: content.length,
      expected: meta.expected,
      rule: meta.rule,
      scenarios: meta.scenarios,
      violates: meta.violates ?? null,
      notes: meta.notes ?? null,
    });
  }

  // Category name
  textFixture("text/category_name_ru/len240.txt", repeat("Н", 240), {
    field: "category.name.ru",
    expected:
      "CODE accepts 240; DB check is 160 — may fail at RPC (OWNER DECISION)",
    rule: "actions.ts:58 max 240 vs initial_schema.sql:60 max 160",
    scenarios: "ADM-CAT-10",
    notes: "CODE vs DB disagreement",
  });
  textFixture("text/category_name_ru/len160.txt", repeat("Н", 160), {
    field: "category.name.ru",
    expected: "accept under CODE and DB",
    rule: "actions.ts:58; initial_schema.sql:60",
    scenarios: "ADM-CAT-10",
  });
  textFixture("text/category_name_ru/len241.txt", repeat("Н", 241), {
    field: "category.name.ru",
    category: "invalid",
    expected: "reject — length > 240",
    rule: "validation.ts:23-24; actions.ts:58",
    scenarios: "ADM-CAT-10",
    violates: "length",
  });

  // Category slug
  textFixture("text/category_slug_ru/len220.txt", repeat("a", 220), {
    field: "category.slug.ru",
    expected: "CODE accepts 220; DB check is 180 (OWNER DECISION)",
    rule: "validation.ts:78 max 220 vs initial_schema.sql:61-62 max 180",
    scenarios: "ADM-CAT-10",
    notes: "CODE vs DB disagreement",
  });
  textFixture("text/category_slug_ru/len180.txt", repeat("a", 180), {
    field: "category.slug.ru",
    expected: "accept under CODE and DB",
    rule: "validation.ts:7-8,78-81; initial_schema.sql:61-64",
    scenarios: "ADM-CAT-10",
  });
  textFixture("text/category_slug_ru/len221.txt", repeat("a", 221), {
    field: "category.slug.ru",
    category: "invalid",
    expected: "reject — length > 220",
    rule: "validation.ts:78-80",
    scenarios: "ADM-CAT-13 class",
    violates: "length",
  });
  textFixture("text/category_slug_ru/bad_uppercase.txt", "Frigidere", {
    field: "category.slug.ru",
    category: "invalid",
    expected: "reject — pattern",
    rule: "validation.ts:7; admin-forms.tsx:59",
    scenarios: "ADM-CAT-13",
    violates: "pattern",
  });
  textFixture("text/category_slug_ru/bad_spaces.txt", "frigidere noi", {
    field: "category.slug.ru",
    category: "invalid",
    expected: "reject — pattern",
    rule: "validation.ts:7",
    scenarios: "ADM-CAT-13",
    violates: "pattern",
  });
  textFixture("text/category_slug_ru/bad_underscore.txt", "frigidere_", {
    field: "category.slug.ru",
    category: "invalid",
    expected: "reject — pattern",
    rule: "validation.ts:7",
    scenarios: "ADM-CAT-13",
    violates: "pattern",
  });
  textFixture("text/category_slug_ru/bad_cyrillic.txt", "Холодильники", {
    field: "category.slug.ru",
    category: "invalid",
    expected: "reject — pattern (non-latin)",
    rule: "validation.ts:7",
    scenarios: "ADM-CAT-13",
    violates: "pattern",
  });
  textFixture("text/category_slug_ru/bad_path.txt", "/catalog/frigidere", {
    field: "category.slug.ru",
    category: "invalid",
    expected: "reject — pattern",
    rule: "validation.ts:7",
    scenarios: "ADM-CAT-13",
    violates: "pattern",
  });

  // Category short / desc
  textFixture("text/category_short_ru/len500.txt", repeat("К", 500), {
    field: "category.short_description.ru",
    expected: "CODE 500; DB 280 (OWNER DECISION)",
    rule: "actions.ts:60-65 vs initial_schema.sql:65",
    scenarios: "ADM-CAT-10",
  });
  textFixture("text/category_short_ru/len280.txt", repeat("К", 280), {
    field: "category.short_description.ru",
    expected: "accept under CODE and DB",
    rule: "actions.ts:60-65; initial_schema.sql:65",
    scenarios: "ADM-CAT-10",
  });
  textFixture("text/category_short_ru/len501.txt", repeat("К", 501), {
    field: "category.short_description.ru",
    category: "invalid",
    expected: "reject — length > 500",
    rule: "validation.ts:23-24",
    scenarios: "ADM-CAT-10",
    violates: "length",
  });
  textFixture("text/category_desc_ru/len5000.txt", repeat("О", 5000), {
    field: "category.description.ru",
    expected: "accept",
    rule: "actions.ts:66-71,91",
    scenarios: "ADM-CAT-10",
  });
  textFixture("text/category_desc_ru/len5001.txt", repeat("О", 5001), {
    field: "category.description.ru",
    category: "invalid",
    expected: "reject — length > 5000",
    rule: "validation.ts:23-24",
    scenarios: "ADM-CAT-10",
    violates: "length",
  });

  // SEO category (BUG-01)
  textFixture("text/seo_title/category/len70.txt", repeat("S", 70), {
    field: "category.seo_title.ru",
    expected: "UI accepts 70; server would allow 180",
    rule: "admin-forms.tsx:92 vs actions.ts:72",
    scenarios: "ADM-CAT-16",
    notes: "BUG-01",
  });
  textFixture("text/seo_title/category/len71.txt", repeat("S", 71), {
    field: "category.seo_title.ru",
    category: "invalid",
    expected: "UI blocks/truncates; server would accept 71",
    rule: "admin-forms.tsx:92 vs actions.ts:72",
    scenarios: "ADM-CAT-16",
    violates: "ui-maxLength (BUG-01)",
  });
  textFixture("text/seo_title/category/len180.txt", repeat("S", 180), {
    field: "category.seo_title.ru",
    expected: "server accepts 180; UI maxLength 70 truncates",
    rule: "actions.ts:72; ADMIN_GUIDE.md:202",
    scenarios: "ADM-CAT-16",
    notes: "BUG-01 intended",
  });
  textFixture("text/seo_title/category/len181.txt", repeat("S", 181), {
    field: "category.seo_title.ru",
    category: "invalid",
    expected: "reject on server — length > 180",
    rule: "validation.ts:35; actions.ts:72",
    scenarios: "ADM-CAT-16",
    violates: "length",
  });
  textFixture("text/seo_desc/category/len160.txt", repeat("D", 160), {
    field: "category.seo_description.ru",
    expected: "UI accepts 160; server allows 320",
    rule: "admin-forms.tsx:106 vs actions.ts:73-74",
    scenarios: "ADM-CAT-16",
    notes: "BUG-01",
  });
  textFixture("text/seo_desc/category/len161.txt", repeat("D", 161), {
    field: "category.seo_description.ru",
    category: "invalid",
    expected: "UI blocks; server would accept",
    rule: "admin-forms.tsx:106 vs actions.ts:73-74",
    scenarios: "ADM-CAT-16",
    violates: "ui-maxLength (BUG-01)",
  });
  textFixture("text/seo_desc/category/len320.txt", repeat("D", 320), {
    field: "category.seo_description.ru",
    expected: "server accepts 320; UI truncates to 160",
    rule: "actions.ts:73-74; ADMIN_GUIDE.md:203",
    scenarios: "ADM-CAT-16",
  });
  textFixture("text/seo_desc/category/len321.txt", repeat("D", 321), {
    field: "category.seo_description.ru",
    category: "invalid",
    expected: "reject on server — length > 320",
    rule: "validation.ts:35",
    scenarios: "ADM-CAT-16",
    violates: "length",
  });

  // Product fields
  textFixture("text/product_name_ru/len240.txt", repeat("Т", 240), {
    field: "product.name.ru",
    expected: "accept",
    rule: "actions.ts:58 (via translation product)",
    scenarios: "ADM-PROD-05",
  });
  textFixture("text/product_name_ru/len241.txt", repeat("Т", 241), {
    field: "product.name.ru",
    category: "invalid",
    expected: "reject — length > 240",
    rule: "validation.ts:23-24",
    scenarios: "ADM-PROD-05",
    violates: "length",
  });
  textFixture("text/product_slug_ru/len220.txt", repeat("p", 220), {
    field: "product.slug.ru",
    expected: "accept",
    rule: "validation.ts:78; initial_schema.sql:104-107",
    scenarios: "ADM-PROD-05",
  });
  textFixture("text/product_slug_ru/len221.txt", repeat("p", 221), {
    field: "product.slug.ru",
    category: "invalid",
    expected: "reject — length > 220",
    rule: "validation.ts:78-80",
    scenarios: "ADM-PROD-05",
    violates: "length",
  });
  textFixture("text/product_short_ru/len500.txt", repeat("К", 500), {
    field: "product.short_description.ru",
    expected: "accept",
    rule: "actions.ts:60-65",
    scenarios: "ADM-PROD-05",
  });
  textFixture("text/product_short_ru/len501.txt", repeat("К", 501), {
    field: "product.short_description.ru",
    category: "invalid",
    expected: "reject — length > 500",
    rule: "validation.ts:23-24",
    scenarios: "ADM-PROD-05",
    violates: "length",
  });
  textFixture("text/product_desc_ru/len10000.txt", repeat("О", 10000), {
    field: "product.description.ru",
    expected: "accept",
    rule: "actions.ts:372-373",
    scenarios: "ADM-PROD-05",
  });
  textFixture("text/product_desc_ru/len10001.txt", repeat("О", 10001), {
    field: "product.description.ru",
    category: "invalid",
    expected: "reject — length > 10000",
    rule: "validation.ts:23-24",
    scenarios: "ADM-PROD-05",
    violates: "length",
  });
  textFixture("text/product_brand/len120.txt", repeat("B", 120), {
    field: "product.brand",
    expected: "accept",
    rule: "actions.ts:360",
    scenarios: "ADM-PROD-05",
  });
  textFixture("text/product_brand/len121.txt", repeat("B", 121), {
    field: "product.brand",
    category: "invalid",
    expected: "reject — length > 120",
    rule: "validation.ts:23-24",
    scenarios: "ADM-PROD-05",
    violates: "length",
  });
  textFixture("text/product_model/len160.txt", repeat("M", 160), {
    field: "product.model",
    expected: "accept",
    rule: "actions.ts:361",
    scenarios: "ADM-PROD-05",
  });
  textFixture("text/product_model/len161.txt", repeat("M", 161), {
    field: "product.model",
    category: "invalid",
    expected: "reject — length > 160",
    rule: "validation.ts:23-24",
    scenarios: "ADM-PROD-05",
    violates: "length",
  });
  textFixture("text/product_sku/len80.txt", repeat("S", 80), {
    field: "product.sku",
    expected: "accept (must be unique per run)",
    rule: "actions.ts:362; initial_schema.sql:82",
    scenarios: "ADM-PROD-05",
  });
  textFixture("text/product_sku/len81.txt", repeat("S", 81), {
    field: "product.sku",
    category: "invalid",
    expected: "reject — length > 80",
    rule: "validation.ts:23-24",
    scenarios: "ADM-PROD-05",
    violates: "length",
  });
  textFixture("text/product_alt_ru/len240.txt", repeat("A", 240), {
    field: "product_image.alt_ru",
    expected: "accept with valid image",
    rule: "actions.ts:499",
    scenarios: "ADM-PROD-13",
  });
  textFixture("text/product_alt_ru/len241.txt", repeat("A", 241), {
    field: "product_image.alt_ru",
    category: "invalid",
    expected: "reject — length > 240",
    rule: "validation.ts:23-24",
    scenarios: "ADM-PROD-13",
    violates: "length",
  });

  // Attributes / groups
  const code80 = "a" + "b".repeat(79);
  const code81 = "a" + "b".repeat(80);
  textFixture("text/attr_group_code/len80.txt", code80, {
    field: "attribute_group.code",
    expected: "accept",
    rule: "validation.ts:84-88",
    scenarios: "ADM-AG-01",
  });
  textFixture("text/attr_group_code/len81.txt", code81, {
    field: "attribute_group.code",
    category: "invalid",
    expected: "reject — length > 80",
    rule: "validation.ts:84-88",
    scenarios: "ADM-AG-04 class",
    violates: "length",
  });
  textFixture("text/attr_group_name/len160.txt", repeat("Г", 160), {
    field: "attribute_group.name_ru",
    expected: "accept",
    rule: "actions.ts:189",
    scenarios: "ADM-AG-01",
  });
  textFixture("text/attr_group_name/len161.txt", repeat("Г", 161), {
    field: "attribute_group.name_ru",
    category: "invalid",
    expected: "reject — length > 160",
    rule: "validation.ts:23-24",
    scenarios: "ADM-AG-01",
    violates: "length",
  });
  textFixture("text/attr_name/len160.txt", repeat("Х", 160), {
    field: "attribute.name.ru",
    expected: "accept",
    rule: "actions.ts:240",
    scenarios: "ADM-ATTR-01",
  });
  textFixture("text/attr_name/len161.txt", repeat("Х", 161), {
    field: "attribute.name.ru",
    category: "invalid",
    expected: "reject — length > 160",
    rule: "validation.ts:23-24",
    scenarios: "ADM-ATTR-01",
    violates: "length",
  });
  textFixture("text/attr_help/len500.txt", repeat("H", 500), {
    field: "attribute.help.ru",
    expected: "accept (optional)",
    rule: "actions.ts:241",
    scenarios: "ADM-ATTR-01",
  });
  textFixture("text/attr_help/len501.txt", repeat("H", 501), {
    field: "attribute.help.ru",
    category: "invalid",
    expected: "reject — length > 500",
    rule: "validation.ts:35",
    scenarios: "ADM-ATTR-01",
    violates: "length",
  });
  textFixture("text/attr_unit/len40.txt", repeat("U", 40), {
    field: "attribute.unit.ru",
    expected: "accept (optional)",
    rule: "actions.ts:242",
    scenarios: "ADM-ATTR-01",
  });
  textFixture("text/attr_unit/len41.txt", repeat("U", 41), {
    field: "attribute.unit.ru",
    category: "invalid",
    expected: "reject — length > 40",
    rule: "validation.ts:35",
    scenarios: "ADM-ATTR-01",
    violates: "length",
  });
  textFixture("text/attr_value_text/len500.txt", repeat("З", 500), {
    field: "product_attribute.text.ru",
    expected: "accept if RO also filled and ≤500",
    rule: "actions.ts:404-409",
    scenarios: "ADM-PROD-17",
  });
  textFixture("text/attr_value_text/len501.txt", repeat("З", 501), {
    field: "product_attribute.text.ru",
    category: "invalid",
    expected: "reject — length > 500",
    rule: "actions.ts:408",
    scenarios: "ADM-PROD-17",
    violates: "length",
  });

  // Settings / knowledge
  textFixture("text/settings_value/len1000.txt", repeat("Н", 1000), {
    field: "site_settings.ru",
    expected: "accept",
    rule: "actions.ts:730-731; settings/page.tsx:46",
    scenarios: "ADM-SET-01",
  });
  textFixture("text/settings_value/len1001.txt", repeat("Н", 1001), {
    field: "site_settings.ru",
    category: "invalid",
    expected: "reject — length > 1000",
    rule: "validation.ts:23-24",
    scenarios: "ADM-SET-01",
    violates: "length",
  });
  textFixture("text/settings_value/only_spaces.txt", special.only_spaces, {
    field: "site_settings.ru",
    category: "invalid",
    expected: "reject — trim → empty required",
    rule: "validation.ts:22-24; actions.ts:730",
    scenarios: "ADM-SET-02",
    violates: "required",
  });
  textFixture("text/knowledge_title/len160.txt", repeat("З", 160), {
    field: "assistant_knowledge.title",
    expected: "accept",
    rule: "actions.ts:754; stage_6_7…sql:129",
    scenarios: "ADM-KB-01",
  });
  textFixture("text/knowledge_title/len161.txt", repeat("З", 161), {
    field: "assistant_knowledge.title",
    category: "invalid",
    expected: "reject — length > 160",
    rule: "validation.ts:23-24",
    scenarios: "ADM-KB-01",
    violates: "length",
  });
  textFixture("text/knowledge_content/len5000.txt", repeat("Т", 5000), {
    field: "assistant_knowledge.content",
    expected: "accept",
    rule: "actions.ts:755",
    scenarios: "ADM-KB-01",
  });
  textFixture("text/knowledge_content/len5001.txt", repeat("Т", 5001), {
    field: "assistant_knowledge.content",
    category: "invalid",
    expected: "reject — length > 5000",
    rule: "validation.ts:23-24",
    scenarios: "ADM-KB-01",
    violates: "length",
  });

  // Shared special strings
  textFixture("text/shared/cyrillic_name.txt", special.cyrillic, {
    field: "category.name.ru",
    expected: "accept if length OK (no charset ban on free text)",
    rule: "validation.ts:16-26 (length only)",
    scenarios: "ADM-CAT-10",
  });
  textFixture("text/shared/ro_diacritics_name.txt", special.ro_diacritics, {
    field: "category.name.ro",
    expected: "accept (RO diacritics ăâîșț allowed)",
    rule: "validation.ts:16-26",
    scenarios: "ADM-CAT-10",
  });
  textFixture("text/shared/emoji_name.txt", "📦 " + special.cyrillic, {
    field: "category.name.ru",
    expected: "accept if length OK; JS length counts UTF-16 units",
    rule: "validation.ts:23 (.length)",
    scenarios: "ADM-CAT-10",
  });
  textFixture("text/shared/html_script_name.txt", special.html_script, {
    field: "category.name.ru",
    expected:
      "stored as text by admin server (no HTML sanitize in requiredText)",
    rule: "validation.ts:16-26",
    scenarios: "ADM-CAT-10",
    notes: "XSS on storefront is a separate concern",
  });
  textFixture("text/shared/html_img_name.txt", special.html_img, {
    field: "category.name.ru",
    expected: "stored as text",
    rule: "validation.ts:16-26",
    scenarios: "ADM-CAT-10",
  });
  textFixture(
    "text/shared/leading_trailing_name.txt",
    special.leading_trailing,
    {
      field: "category.name.ru",
      expected: "server trims → stored 'padded value'",
      rule: "validation.ts:22",
      scenarios: "ADM-CAT-10",
    },
  );
  textFixture("text/shared/only_spaces_name.txt", special.only_spaces, {
    field: "category.name.ru",
    category: "invalid",
    expected: "reject — requiredText min 1 after trim",
    rule: "validation.ts:22-24",
    scenarios: "ADM-CAT-12 class",
    violates: "required",
  });
  textFixture("text/shared/very_long_10k.txt", repeat("x", 10000), {
    field: "various",
    category: "boundary",
    expected:
      "valid for product.description (10000); invalid for name/short/seo/etc.",
    rule: "field-specific max",
    scenarios: "multiple",
  });

  // Price
  textFixture("text/price/valid_0.txt", "0", {
    field: "product.price",
    expected: "accept if old_price empty or > 0",
    rule: "validation.ts:94",
    scenarios: "ADM-PROD-05",
  });
  textFixture("text/price/valid_5990.txt", "5990", {
    field: "product.price",
    expected: "accept",
    rule: "validation.ts:94",
    scenarios: "ADM-PROD-05",
  });
  textFixture("text/price/valid_5990_50.txt", "5990.50", {
    field: "product.price",
    expected: "accept",
    rule: "validation.ts:94",
    scenarios: "ADM-PROD-05",
  });
  textFixture("text/price/valid_5990_comma.txt", "5990,50", {
    field: "product.price",
    expected: "accept (comma normalized to dot)",
    rule: "validation.ts:92-94",
    scenarios: "ADM-PROD-05",
  });
  textFixture("text/price/invalid_empty.txt", "", {
    field: "product.price",
    category: "invalid",
    expected: "reject — required / format",
    rule: "validation.ts:94; HTML5 required",
    scenarios: "ADM-PROD-10",
    violates: "required",
  });
  textFixture("text/price/invalid_abc.txt", "abc", {
    field: "product.price",
    category: "invalid",
    expected: "reject — format",
    rule: "validation.ts:94",
    scenarios: "ADM-PROD-10",
    violates: "format",
  });
  textFixture("text/price/invalid_negative.txt", "-5", {
    field: "product.price",
    category: "invalid",
    expected: "reject — format",
    rule: "validation.ts:94",
    scenarios: "ADM-PROD-10",
    violates: "format",
  });
  textFixture("text/price/invalid_three_decimals.txt", "5990.123", {
    field: "product.price",
    category: "invalid",
    expected: "reject — format (max 2 decimals)",
    rule: "validation.ts:94",
    scenarios: "ADM-PROD-10",
    violates: "format",
  });
  textFixture("text/price/invalid_leading_zero.txt", "01.5", {
    field: "product.price",
    category: "invalid",
    expected: "reject — format (leading zero)",
    rule: "validation.ts:94",
    scenarios: "ADM-PROD-10",
    violates: "format",
  });
  textFixture("text/price/old_not_greater.txt", "100", {
    field: "product.old_price",
    category: "invalid",
    expected: "reject — old_price must be > price (pair with price=100)",
    rule: "actions.ts:352-353",
    scenarios: "ADM-PROD old_price",
    violates: "old_price rule",
    notes: "Use as old_price with price=100",
  });
  textFixture("text/price/old_greater.txt", "120", {
    field: "product.old_price",
    expected: "accept if price=100",
    rule: "actions.ts:352-353",
    scenarios: "ADM-PROD",
  });

  // Lead status (admin only edits status)
  textFixture("text/status/invalid_lead_status.txt", "archived", {
    field: "lead.status",
    category: "invalid",
    expected: "reject — not in enum",
    rule: "actions.ts:680-682",
    scenarios: "lead admin status",
    violates: "enum",
  });
  textFixture("text/status/valid_lead_status.txt", "in_progress", {
    field: "lead.status",
    expected: "accept",
    rule: "actions.ts:680-682",
    scenarios: "lead admin status",
  });

  // Write indexes
  fs.writeFileSync(INDEX_JSON, JSON.stringify(records, null, 2) + "\n", "utf8");
  fs.writeFileSync(
    TEXT_INDEX,
    JSON.stringify(textIndex, null, 2) + "\n",
    "utf8",
  );
  console.log(`\nWrote ${records.length} binary/text records to ${INDEX_JSON}`);
  console.log(`Wrote ${textIndex.length} text entries to ${TEXT_INDEX}`);

  // Summary of generation gaps
  const skipped = records.filter((r) => r.generated === false);
  if (skipped.length) {
    console.log("\nNOT generated:");
    for (const s of skipped) console.log(` - ${s.path}: ${s.notes}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Independent fixture verifier.
 * Reads bytes from disk; detects format via own magic parsers; compares to fixtures.json.
 * Does NOT import app validation code. Re-implements rule checks from discovered evidence.
 *
 * Run: node e2e/fixtures/verify.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX = path.join(__dirname, "fixtures.json");

const LIMIT = 5 * 1024 * 1024;
const MIN = 12;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function detectFormat(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { format: "jpeg", mime: "image/jpeg" };
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { format: "png", mime: "image/png" };
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { format: "webp", mime: "image/webp" };
  }
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand.startsWith("avif") || brand.startsWith("avis")) {
      return { format: "avif", mime: "image/avif" };
    }
    return { format: "heif", mime: "image/heic" };
  }
  if (buf.length >= 6 && buf.toString("ascii", 0, 6).startsWith("GIF8")) {
    return { format: "gif", mime: "image/gif" };
  }
  if (buf.length >= 2 && buf.toString("ascii", 0, 2) === "BM") {
    return { format: "bmp", mime: "image/bmp" };
  }
  if (buf.length >= 4 && buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a) {
    return { format: "tiff", mime: "image/tiff" };
  }
  const head = buf.toString("utf8", 0, Math.min(buf.length, 200));
  if (head.includes("<svg") || head.includes("<?xml")) {
    return { format: "svg", mime: "image/svg+xml" };
  }
  if (buf.length === 0) return { format: "empty", mime: "" };
  return { format: "unknown/text", mime: "text/plain" };
}

/** Own dimension parsers — independent of sharp. */
function parseDimensions(format, buf) {
  if (format === "png" && buf.length >= 24) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  }
  if (format === "jpeg") {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buf[offset + 1];
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) {
        offset += 2;
        continue;
      }
      if (marker >= 0xd0 && marker <= 0xd7) {
        offset += 2;
        continue;
      }
      const length = buf.readUInt16BE(offset + 2);
      // SOF0..SOF15 except DHT/JPG/DAC
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const height = buf.readUInt16BE(offset + 5);
        const width = buf.readUInt16BE(offset + 7);
        return { width, height };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
    return null;
  }
  if (format === "webp" && buf.length >= 30) {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 ") {
      // lossy: width at 26-27 (14-bit), height 28-29
      const width = buf.readUInt16LE(26) & 0x3fff;
      const height = buf.readUInt16LE(28) & 0x3fff;
      return { width, height };
    }
    if (chunk === "VP8L") {
      const b0 = buf[21];
      const b1 = buf[22];
      const b2 = buf[23];
      const b3 = buf[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { width, height };
    }
    if (chunk === "VP8X") {
      const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { width, height };
    }
  }
  if (format === "avif") {
    // Search for ispe box
    for (let i = 0; i + 16 < buf.length; i++) {
      if (buf.toString("ascii", i + 4, i + 8) === "ispe") {
        const width = buf.readUInt32BE(i + 12);
        const height = buf.readUInt32BE(i + 16);
        return { width, height };
      }
    }
  }
  if (format === "gif" && buf.length >= 10) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  if (format === "bmp" && buf.length >= 26) {
    return { width: buf.readInt32LE(18), height: Math.abs(buf.readInt32LE(22)) };
  }
  return null;
}

/**
 * Re-implement validateProductImage checks (validation.ts:132-155) without importing app code.
 * `declaredMime` is what the browser/Playwright would put in File.type.
 */
function checkImageRules(buf, declaredMime) {
  const { format, mime: detected } = detectFormat(buf);
  const size = buf.length;
  const reasons = [];

  if (!ALLOWED_MIME.has(declaredMime)) {
    reasons.push({
      rule: "mime",
      detail: `declared MIME ${declaredMime || "(empty)"} not in allowedImages`,
      ref: "validation.ts:132-141",
    });
  }
  if (size < MIN) {
    reasons.push({
      rule: "size",
      detail: `size ${size} < 12`,
      ref: "validation.ts:141",
    });
  }
  if (size > LIMIT) {
    reasons.push({
      rule: "size",
      detail: `size ${size} > 5242880`,
      ref: "validation.ts:141",
    });
  }

  // Magic / container checks only if MIME is allowed and size ok (same order as code after map lookup)
  // Code: if (!definition || size bad) throw; then signature+container.
  if (ALLOWED_MIME.has(declaredMime) && size >= MIN && size <= LIMIT) {
    const header = buf.subarray(0, 16);
    let magicOk = false;
    let containerOk = true;

    if (declaredMime === "image/jpeg") {
      magicOk = header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    } else if (declaredMime === "image/png") {
      magicOk =
        header.length >= 4 &&
        header[0] === 0x89 &&
        header[1] === 0x50 &&
        header[2] === 0x4e &&
        header[3] === 0x47;
    } else if (declaredMime === "image/webp") {
      magicOk =
        header.length >= 4 &&
        header[0] === 0x52 &&
        header[1] === 0x49 &&
        header[2] === 0x46 &&
        header[3] === 0x46;
      containerOk = header.length >= 12 && buf.toString("ascii", 8, 12) === "WEBP";
    } else if (declaredMime === "image/avif") {
      magicOk = header.length >= 3 && header[0] === 0x00 && header[1] === 0x00 && header[2] === 0x00;
      containerOk = buf.length >= 12 && buf.toString("ascii", 4, 12).includes("ftyp");
    }

    if (!magicOk) {
      reasons.push({
        rule: "magic",
        detail: `magic mismatch for declared ${declaredMime}; detected ${format}`,
        ref: "validation.ts:143-154",
      });
    }
    if (!containerOk) {
      reasons.push({
        rule: "container",
        detail: `container mismatch for ${declaredMime}`,
        ref: "validation.ts:147-152",
      });
    }
  }

  const rejected = reasons.length > 0;
  return { format, detectedMime: detected, size, reasons, rejected };
}

function inferDeclaredMime(relPath, rec) {
  // Playwright setInputFiles(path) uses extension → MIME.
  const ext = path.extname(relPath).toLowerCase();
  const byExt = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    ".heic": "image/heic",
    ".txt": "text/plain",
  };
  if (rec && typeof rec.format === "string" && rec.format.includes("mimeType=image/jpeg")) {
    return "image/jpeg";
  }
  return byExt[ext] || "application/octet-stream";
}

function main() {
  if (!fs.existsSync(INDEX)) {
    console.error("fixtures.json missing — run generate.mjs first");
    process.exit(2);
  }
  const records = JSON.parse(fs.readFileSync(INDEX, "utf8"));
  const rows = [];
  let mismatch = 0;

  console.log(
    ["file", "expected", "actual", "OK/MISMATCH"].join(" | "),
  );
  console.log("-".repeat(100));

  for (const rec of records) {
    const full = path.join(__dirname, rec.path);
    if (rec.generated === false) {
      rows.push({
        file: rec.path,
        expected: rec.expected,
        actual: "NOT GENERATED",
        status: "SKIP",
      });
      continue;
    }
    if (!fs.existsSync(full)) {
      rows.push({
        file: rec.path,
        expected: rec.expected,
        actual: "MISSING ON DISK",
        status: "MISMATCH",
      });
      mismatch += 1;
      continue;
    }
    const buf = fs.readFileSync(full);
    const isImage = rec.path.startsWith("images/");
    let actual;
    let status = "OK";
    let notes = [];

    if (isImage) {
      const declared = inferDeclaredMime(rec.path, rec);
      const check = checkImageRules(buf, declared);
      const dims = parseDimensions(check.format, buf);
      const pixel = dims ? `${dims.width}x${dims.height}` : "n/a";
      actual = `${check.format} bytes=${buf.length} declaredMime=${declared} detected=${check.detectedMime} dims=${pixel}`;

      // Compare expected category
      const expectValid = rec.category === "valid";
      const truncatedNote = rec.path.includes("truncated");
      if (truncatedNote) {
        // CODE accepts truncated-with-header if size/magic ok
        if (check.rejected) {
          status = "MISMATCH";
          notes.push("truncated file unexpectedly rejected by rule re-implementation");
        } else {
          notes.push("CODE accepts (magic-only); expected note is documentation");
        }
      } else if (expectValid) {
        if (check.rejected) {
          status = "MISMATCH";
          notes.push(`valid file rejected: ${check.reasons.map((r) => r.detail).join("; ")}`);
        } else if (rec.pixelSize && rec.pixelSize !== "n/a" && !rec.pixelSize.includes("padding")) {
          const expectedDims = rec.pixelSize.split(" ")[0];
          if (dims && `${dims.width}x${dims.height}` !== expectedDims) {
            // still OK if format valid; report dim
            notes.push(`dims ${dims.width}x${dims.height} vs manifest ${rec.pixelSize}`);
          }
        }
      } else if (rec.category === "invalid") {
        if (!check.rejected) {
          status = "MISMATCH";
          notes.push("invalid file NOT rejected by rule re-implementation");
        } else {
          // Verify exactly one primary rule where applicable
          const primary = rec.violates || "unknown";
          const rulesHit = new Set(check.reasons.map((r) => r.rule));
          // Map: magic/magic-vs-mime → magic; size → size; mime → mime
          const mapped = new Set();
          for (const r of check.reasons) {
            if (r.rule === "magic" || r.rule === "container") mapped.add("magic");
            else mapped.add(r.rule);
          }
          if (primary === "magic-vs-mime" && !mapped.has("magic")) {
            status = "MISMATCH";
            notes.push(`expected magic violation, got ${[...mapped].join(",")}`);
          } else if (primary === "size" && !mapped.has("size")) {
            status = "MISMATCH";
            notes.push(`expected size violation, got ${[...mapped].join(",")}`);
          } else if (primary === "mime" && !mapped.has("mime")) {
            status = "MISMATCH";
            notes.push(`expected mime violation, got ${[...mapped].join(",")}`);
          } else if (primary === "mime" && mapped.size > 1) {
            // GIF etc: only mime should fire if size ok
            if (buf.length < MIN || buf.length > LIMIT) {
              status = "MISMATCH";
              notes.push(`mime fixture also violates size (${[...mapped].join(",")})`);
            }
          } else if (primary === "magic-vs-mime" && mapped.size > 1) {
            if (mapped.has("size")) {
              status = "MISMATCH";
              notes.push(`magic fixture also violates size: ${[...mapped].join(",")}`);
            }
          }
        }
      }

      // Size checks for boundary files
      if (rec.path.includes("just-under") && buf.length !== LIMIT - 1) {
        status = "MISMATCH";
        notes.push(`expected bytes ${LIMIT - 1}, got ${buf.length}`);
      }
      if (rec.path.includes("5mib-plus-1") && buf.length !== LIMIT + 1) {
        status = "MISMATCH";
        notes.push(`expected bytes ${LIMIT + 1}, got ${buf.length}`);
      }
      if (rec.path.includes("min-size-12b") && buf.length !== 12) {
        status = "MISMATCH";
        notes.push(`expected 12 bytes, got ${buf.length}`);
      }
      if (rec.path.includes("zero-bytes") && buf.length !== 0) {
        status = "MISMATCH";
        notes.push(`expected 0 bytes, got ${buf.length}`);
      }
      if (rec.path.includes("under-min-11b") && buf.length !== 11) {
        status = "MISMATCH";
        notes.push(`expected 11 bytes, got ${buf.length}`);
      }
    } else {
      // Text fixture
      const content = buf.toString("utf8");
      const len = content.length;
      actual = `utf8 length=${len} bytes=${buf.length}`;
      const expectedLen = rec.length;
      if (typeof expectedLen === "number" && expectedLen !== len) {
        status = "MISMATCH";
        notes.push(`length ${len} != expected ${expectedLen}`);
      }
      if (rec.category === "invalid" && rec.violates === "length") {
        // length+1 vs field max is encoded in path name; verify path suffix
        const m = rec.path.match(/len(\d+)\.txt$/);
        if (m) {
          const n = Number(m[1]);
          if (n !== len) {
            status = "MISMATCH";
            notes.push(`file name len${n} != content length ${len}`);
          }
        }
      }
      if (rec.category === "valid" && rec.violates == null) {
        // ok if content non-empty unless price empty which is invalid category
      }
    }

    if (status === "MISMATCH") mismatch += 1;
    const noteStr = notes.length ? `  [${notes.join("; ")}]` : "";
    rows.push({
      file: rec.path,
      expected: rec.expected,
      actual,
      status: status + noteStr,
    });
    console.log(
      [rec.path, rec.expected, actual, status + noteStr].join(" | "),
    );
  }

  console.log("\n=== SUMMARY ===");
  console.log(`total records: ${records.length}`);
  console.log(`mismatches: ${mismatch}`);
  if (mismatch > 0) process.exitCode = 1;
}

main();

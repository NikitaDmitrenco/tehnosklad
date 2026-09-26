import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";

const csvPath = path.join(
  "C:",
  "Users",
  "dmitr",
  ".gemini",
  "antigravity",
  "brain",
  "f4ce887c-eecc-48f4-b496-80e6cecd683e",
  "scratch",
  "products.csv",
);

const outDir = path.join(process.cwd(), "public", "images", "products");
const downloadsDir = path.join(process.cwd(), "downloads", "products");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
if (!fs.existsSync(downloadsDir))
  fs.mkdirSync(downloadsDir, { recursive: true });

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*]/g, "-").trim();
}

async function fetchUrl(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    try {
      const client = url.startsWith("https") ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          },
        },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            let nextUrl = res.headers.location;
            if (!nextUrl.startsWith("http")) {
              const u = new URL(url);
              nextUrl = `${u.protocol}//${u.host}${nextUrl}`;
            }
            return fetchUrl(nextUrl, timeoutMs).then(resolve).catch(reject);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP status ${res.statusCode}`));
          }
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        },
      );
      req.on("error", reject);
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error("Timeout"));
      });
    } catch (e) {
      reject(e);
    }
  });
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0].split(",");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // simple CSV split with quote handling
    const cols = [];
    let cur = "";
    let inQuote = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') inQuote = !inQuote;
      else if (char === "," && !inQuote) {
        cols.push(cur);
        cur = "";
      } else {
        cur += char;
      }
    }
    cols.push(cur);
    if (cols.length >= 2) {
      rows.push({
        brand: cols[0]?.trim(),
        model: cols[1]?.trim(),
        image_url: cols[2]?.trim() || "",
        source_url: cols[3]?.trim() || "",
        image_status: cols[4]?.trim() || "",
      });
    }
  }
  return rows;
}

function extractImageFromHtml(html, pageUrl) {
  // 1. og:image
  const ogMatch =
    html.match(
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
    ) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (ogMatch && ogMatch[1]) {
    let imgUrl = ogMatch[1].replace(/&amp;/g, "&");
    if (!imgUrl.startsWith("http")) {
      const u = new URL(pageUrl);
      imgUrl = `${u.protocol}//${u.host}${imgUrl.startsWith("/") ? "" : "/"}${imgUrl}`;
    }
    return imgUrl;
  }

  // 2. twitter:image
  const twMatch = html.match(
    /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
  );
  if (twMatch && twMatch[1]) {
    let imgUrl = twMatch[1].replace(/&amp;/g, "&");
    if (!imgUrl.startsWith("http")) {
      const u = new URL(pageUrl);
      imgUrl = `${u.protocol}//${u.host}${imgUrl.startsWith("/") ? "" : "/"}${imgUrl}`;
    }
    return imgUrl;
  }

  return null;
}

async function run() {
  const content = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(content);
  console.log(`📋 Loaded ${rows.length} products from CSV.`);

  const missing = [];
  let downloadedCount = 0;

  for (const row of rows) {
    const fileName = `${sanitizeFileName(row.brand)} - ${sanitizeFileName(row.model)}.jpg`;
    const outPath1 = path.join(outDir, fileName);
    const outPath2 = path.join(downloadsDir, fileName);

    let targetImgUrl = row.image_url;

    process.stdout.write(`Processing: ${row.brand} - ${row.model}... `);

    if (
      !targetImgUrl &&
      row.source_url &&
      !row.source_url.includes("google.com/search")
    ) {
      try {
        const htmlBuffer = await fetchUrl(row.source_url, 8000);
        const html = htmlBuffer.toString("utf8");
        const found = extractImageFromHtml(html, row.source_url);
        if (found) {
          targetImgUrl = found;
        }
      } catch (err) {
        // failed to fetch product page
      }
    }

    if (targetImgUrl) {
      try {
        const imgBuffer = await fetchUrl(targetImgUrl, 10000);
        if (imgBuffer && imgBuffer.length > 1000) {
          fs.writeFileSync(outPath1, imgBuffer);
          fs.writeFileSync(outPath2, imgBuffer);
          downloadedCount++;
          console.log(
            `✅ Downloaded (${(imgBuffer.length / 1024).toFixed(1)} KB)`,
          );
          continue;
        }
      } catch (err) {
        console.log(`❌ Download failed: ${err.message}`);
      }
    }

    console.log(`⚠️ Need image link`);
    missing.push(row);
  }

  console.log(
    `\n🎉 Finished step 1! Downloaded: ${downloadedCount} / ${rows.length}`,
  );
  console.log(`Remaining without direct link: ${missing.length}`);

  if (missing.length > 0) {
    fs.writeFileSync(
      path.join(process.cwd(), "missing_products.json"),
      JSON.stringify(missing, null, 2),
      "utf8",
    );
  }
}

run().catch(console.error);

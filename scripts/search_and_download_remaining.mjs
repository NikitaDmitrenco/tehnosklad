import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";

const outDir = path.join(process.cwd(), "public", "images", "products");
const downloadsDir = path.join(process.cwd(), "downloads", "products");

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*]/g, "-").trim();
}

async function fetchUrl(url, headers = {}, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    try {
      const client = url.startsWith("https") ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "*/*",
            ...headers,
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
            return fetchUrl(nextUrl, headers, timeoutMs)
              .then(resolve)
              .catch(reject);
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

// Function to search image via DuckDuckGo Image API (vqd token)
async function searchDuckDuckGoImage(query) {
  try {
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query + " product white background")}&t=h_&iar=images&iax=images&ia=images`;
    const htmlBuf = await fetchUrl(searchUrl);
    const html = htmlBuf.toString("utf8");
    const vqdMatch =
      html.match(/vqd=["']([^"']+)["']/i) || html.match(/vqd=([^&"']+)/i);
    if (!vqdMatch) return null;
    const vqd = vqdMatch[1];

    const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,type:photo,&p=1`;
    const jsonBuf = await fetchUrl(apiUrl, {
      Referer: "https://duckduckgo.com/",
    });
    const data = JSON.parse(jsonBuf.toString("utf8"));
    if (data.results && data.results.length > 0) {
      // Find highest resolution image
      for (const res of data.results) {
        if (
          res.image &&
          (res.image.startsWith("http://") || res.image.startsWith("https://"))
        ) {
          return res.image;
        }
      }
    }
  } catch (e) {
    // console.error('DDG error:', e.message);
  }
  return null;
}

// Extract demoProducts to ensure all 105 products are covered
const demoFile = path.join(
  process.cwd(),
  "src",
  "features",
  "catalog",
  "demo-data.ts",
);
const demoContent = fs.readFileSync(demoFile, "utf8");
const marker = "export const demoProducts: DemoProduct[] = ";
const jsonStr = demoContent
  .substring(demoContent.indexOf(marker) + marker.length)
  .trim()
  .replace(/;$/, "");
const demoProducts = JSON.parse(jsonStr);

async function run() {
  console.log(`Starting image search & download for products...`);

  let alreadyPresent = 0;
  let downloadedNow = 0;
  let failed = [];

  for (const p of demoProducts) {
    const fileName = `${sanitizeFileName(p.brand)} - ${sanitizeFileName(p.model)}.jpg`;
    const outPath1 = path.join(outDir, fileName);
    const outPath2 = path.join(downloadsDir, fileName);

    if (fs.existsSync(outPath1) && fs.statSync(outPath1).size > 2000) {
      alreadyPresent++;
      continue;
    }

    process.stdout.write(`Searching image for: ${p.brand} ${p.model}... `);
    const imgUrl = await searchDuckDuckGoImage(`${p.brand} ${p.model}`);

    if (imgUrl) {
      try {
        const buf = await fetchUrl(imgUrl, {}, 10000);
        if (buf && buf.length > 2000) {
          fs.writeFileSync(outPath1, buf);
          fs.writeFileSync(outPath2, buf);
          downloadedNow++;
          console.log(`✅ Saved (${(buf.length / 1024).toFixed(1)} KB)`);
          await new Promise((r) => setTimeout(r, 600)); // be nice to rate limit
          continue;
        }
      } catch (err) {
        console.log(`❌ Download error: ${err.message}`);
      }
    } else {
      console.log(`⚠️ Not found via search`);
    }

    failed.push(p);
  }

  console.log(`\n========================================`);
  console.log(`Already existed: ${alreadyPresent}`);
  console.log(`Downloaded now: ${downloadedNow}`);
  console.log(`Remaining missing: ${failed.length} / ${demoProducts.length}`);
  console.log(
    `Total ready in folder: ${alreadyPresent + downloadedNow} / ${demoProducts.length}`,
  );
}

run().catch(console.error);

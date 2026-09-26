import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function calcCrc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const typeAndData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(calcCrc32(typeAndData), 0);

  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function generatePngBuffer(width, height) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createPngChunk("IHDR", ihdr);

  const rawRows = [];
  const ss = 4; // 4x4 supersampling

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter type 0: None

    for (let x = 0; x < width; x++) {
      let rSum = 0,
        gSum = 0,
        bSum = 0,
        aSum = 0;

      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = (x + (sx + 0.5) / ss) / width;
          const py = (y + (sy + 0.5) / ss) / height;

          // Circle check: center (0.5, 0.5), radius 0.5
          const dx = px - 0.5;
          const dy = py - 0.5;
          const insideCircle = dx * dx + dy * dy <= 0.248;

          if (!insideCircle) {
            aSum += 0;
          } else {
            // Bold letter T bounds (80px stroke thickness on 512 canvas):
            // Top bar: y in [116/512, 196/512] = [0.2265625, 0.3828125], x in [106/512, 406/512] = [0.20703125, 0.79296875]
            // Stem: y in [196/512, 396/512] = [0.3828125, 0.7734375], x in [216/512, 296/512] = [0.421875, 0.578125]
            const inTopBar =
              py >= 0.2265625 &&
              py <= 0.3828125 &&
              px >= 0.20703125 &&
              px <= 0.79296875;
            const inStem =
              py >= 0.3828125 &&
              py <= 0.7734375 &&
              px >= 0.421875 &&
              px <= 0.578125;

            if (inTopBar || inStem) {
              // Yellow T: #F4C400 (RGB 244, 196, 0)
              rSum += 244;
              gSum += 196;
              bSum += 0;
              aSum += 255;
            } else {
              // Black background: #000000 (RGB 0, 0, 0)
              rSum += 0;
              gSum += 0;
              bSum += 0;
              aSum += 255;
            }
          }
        }
      }

      const totalSamples = ss * ss;
      const finalR = Math.round(rSum / totalSamples);
      const finalG = Math.round(gSum / totalSamples);
      const finalB = Math.round(bSum / totalSamples);
      const finalA = Math.round(aSum / totalSamples);

      const offset = 1 + x * 4;
      row[offset] = finalR;
      row[offset + 1] = finalG;
      row[offset + 2] = finalB;
      row[offset + 3] = finalA;
    }

    rawRows.push(row);
  }

  const idatRaw = Buffer.concat(rawRows);
  const idatCompressed = zlib.deflateSync(idatRaw, { level: 9 });
  const idatChunk = createPngChunk("IDAT", idatCompressed);

  const iendChunk = createPngChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function generateIcoBuffer(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let currentOffset = 6 + count * 16;
  const entries = [];
  const imageBuffers = [];

  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry[0] = width >= 256 ? 0 : width;
    entry[1] = height >= 256 ? 0 : height;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(currentOffset, 12);

    entries.push(entry);
    imageBuffers.push(buffer);
    currentOffset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...imageBuffers]);
}

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <circle cx="256" cy="256" r="256" fill="#000000" />
  <path d="M 106 116 H 406 V 196 H 296 V 396 H 216 V 196 H 106 Z" fill="#F4C400" />
</svg>
`;

const targets = ["public", "src/app"];

for (const targetDir of targets) {
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "icon.svg"), svgContent, "utf8");
  fs.writeFileSync(path.join(targetDir, "favicon.svg"), svgContent, "utf8");

  const png32 = generatePngBuffer(32, 32);
  const png180 = generatePngBuffer(180, 180);
  const png192 = generatePngBuffer(192, 192);
  const png512 = generatePngBuffer(512, 512);

  fs.writeFileSync(path.join(targetDir, "icon.png"), png32);
  fs.writeFileSync(path.join(targetDir, "apple-icon.png"), png180);
  fs.writeFileSync(path.join(targetDir, "icon-192.png"), png192);
  fs.writeFileSync(path.join(targetDir, "icon-512.png"), png512);

  const icoBuf = generateIcoBuffer([{ width: 32, height: 32, buffer: png32 }]);
  fs.writeFileSync(path.join(targetDir, "favicon.ico"), icoBuf);
}

console.log("Successfully generated bold favicons!");

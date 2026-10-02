import type { Page, Route } from "@playwright/test";

/**
 * Programmatic test images: created inside the page (canvas) or as raw
 * buffers — nothing large lives in git. Files are injected straight into the
 * target <input type="file"> via DataTransfer + a bubbling change event, so
 * the real React onChange handler (compression included) runs unchanged.
 */

export type GeneratedImageSpec =
  | {
      kind: "noiseJpeg";
      name: string;
      width: number;
      height: number;
      quality: number;
    }
  | {
      kind: "exifJpeg";
      name: string;
      width: number;
      height: number;
      quality: number;
      orientation: number;
    }
  | { kind: "alphaPng"; name: string; width: number; height: number }
  | { kind: "gradientPng"; name: string; width: number; height: number }
  | { kind: "text"; name: string; mimeType: string; content: string };

export interface InjectedFileInfo {
  size: number;
  type: string;
  name: string;
}

export async function injectGeneratedImage(
  page: Page,
  selector: string,
  spec: GeneratedImageSpec,
  options?: { waitForReady?: boolean },
): Promise<InjectedFileInfo> {
  // The form sets data-ready once its React component is live; selecting a
  // file before that would race hydration, so wait first — unless the test
  // deliberately targets the pre-hydration path (waitForReady: false).
  if (options?.waitForReady !== false)
    await waitForImageFormReady(page, selector);
  return page.evaluate(
    async ([sel, imageSpec]: [string, GeneratedImageSpec]) => {
      const canvasOf = (width: number, height: number) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
      };
      const toBlob = (
        canvas: HTMLCanvasElement,
        type: string,
        quality?: number,
      ) =>
        new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("toBlob null"))),
            type,
            quality,
          );
        });

      // Minimal EXIF (little-endian TIFF) with a single Orientation tag,
      // spliced right after SOI so createImageBitmap honors it.
      const spliceExif = (jpeg: Uint8Array, orientation: number) => {
        const tiff = new Uint8Array([
          0x49,
          0x49,
          0x2a,
          0x00,
          0x08,
          0x00,
          0x00,
          0x00, // II*\0, IFD at 8
          0x01,
          0x00, // one entry
          0x12,
          0x01,
          0x03,
          0x00,
          0x01,
          0x00,
          0x00,
          0x00, // tag 0x0112, SHORT, count 1
          orientation,
          0x00,
          0x00,
          0x00, // value
          0x00,
          0x00,
          0x00,
          0x00, // next IFD
        ]);
        const payloadLength = 6 + tiff.length; // "Exif\0\0" + TIFF
        const app1 = new Uint8Array(4 + payloadLength);
        app1[0] = 0xff;
        app1[1] = 0xe1;
        app1[2] = ((payloadLength + 2) >> 8) & 0xff;
        app1[3] = (payloadLength + 2) & 0xff;
        app1.set(new TextEncoder().encode("Exif\0\0"), 4);
        app1.set(tiff, 10);
        const out = new Uint8Array(jpeg.length + app1.length);
        out.set(jpeg.subarray(0, 2), 0); // SOI
        out.set(app1, 2);
        out.set(jpeg.subarray(2), 2 + app1.length);
        return out;
      };

      let blob: Blob;
      const spec = imageSpec;
      if (spec.kind === "noiseJpeg" || spec.kind === "exifJpeg") {
        const canvas = canvasOf(spec.width, spec.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("no 2d context");
        if (spec.kind === "noiseJpeg") {
          const image = context.createImageData(spec.width, spec.height);
          const data = image.data;
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.random() * 255;
            data[i + 1] = Math.random() * 255;
            data[i + 2] = Math.random() * 255;
            data[i + 3] = 255;
          }
          context.putImageData(image, 0, 0);
        } else {
          // Smooth gradient: fast to encode, still over IMAGE_MAX_SIDE so
          // the EXIF test exercises the resize path without noise bulk.
          const gradient = context.createLinearGradient(
            0,
            0,
            spec.width,
            spec.height,
          );
          gradient.addColorStop(0, "#2244ff");
          gradient.addColorStop(1, "#ff8800");
          context.fillStyle = gradient;
          context.fillRect(0, 0, spec.width, spec.height);
        }
        blob = await toBlob(canvas, "image/jpeg", spec.quality);
        if (spec.kind === "exifJpeg") {
          const bytes = spliceExif(
            new Uint8Array(await blob.arrayBuffer()),
            spec.orientation,
          );
          blob = new Blob([bytes], { type: "image/jpeg" });
        }
      } else if (spec.kind === "alphaPng") {
        // Left half transparent, right half opaque: survives downscale so a
        // pixel sample at both halves proves the alpha channel is intact.
        const canvas = canvasOf(spec.width, spec.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("no 2d context");
        context.clearRect(0, 0, spec.width, spec.height);
        context.fillStyle = "#2266cc";
        context.fillRect(spec.width / 2, 0, spec.width / 2, spec.height);
        blob = await toBlob(canvas, "image/png");
      } else if (spec.kind === "gradientPng") {
        const canvas = canvasOf(spec.width, spec.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("no 2d context");
        const gradient = context.createLinearGradient(
          0,
          0,
          spec.width,
          spec.height,
        );
        gradient.addColorStop(0, "#1098ad");
        gradient.addColorStop(1, "#495057");
        context.fillStyle = gradient;
        context.fillRect(0, 0, spec.width, spec.height);
        blob = await toBlob(canvas, "image/png");
      } else {
        blob = new Blob([spec.content], { type: spec.mimeType });
      }

      const file = new File([blob], spec.name, {
        type: blob.type || ("mimeType" in spec ? spec.mimeType : ""),
      });
      const input = document.querySelector(sel);
      if (!(input instanceof HTMLInputElement))
        throw new Error(`file input not found: ${sel}`);
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return { size: file.size, type: file.type, name: file.name };
    },
    [selector, spec] as [string, GeneratedImageSpec],
  );
}

/**
 * Wait until the upload form's React component is live (data-ready marker
 * set in useEffect). Explicitly not a sleep: resolves the moment hydration
 * of THIS component finishes.
 */
export async function waitForImageFormReady(page: Page, selector: string) {
  await page.waitForFunction(
    (sel) => document.querySelector(sel)?.getAttribute("data-ready") === "1",
    selector,
    { timeout: 30_000 },
  );
}

/**
 * Wait until the form's synchronous busy marker appears (set during the
 * change dispatch) and then clears (compression finished). The marker makes
 * the wait deterministic instead of racing the async handler.
 */
export async function waitForImageProcessed(page: Page, selector: string) {
  const input = page.locator(selector);
  await input.waitFor({ state: "attached" });
  await input.evaluate((el) =>
    el.getAttribute("data-compressing") === "1"
      ? true
      : new Promise<boolean>((resolve) => {
          // The marker is set synchronously inside the change handler; if it
          // is not there yet, the dispatch has not been processed — poll a
          // moment before giving up.
          const started = Date.now();
          const tick = () => {
            if (el.getAttribute("data-compressing") === "1")
              return resolve(true);
            if (Date.now() - started > 500) return resolve(false);
            setTimeout(tick, 16);
          };
          tick();
        }),
  );
  await page.waitForFunction(
    (sel) =>
      document.querySelector(sel)?.getAttribute("data-compressing") !== "1",
    selector,
    { timeout: 60_000 },
  );
}

/** Animated GIF above the 4 MiB upload limit (NETSCAPE loop + filler). */
export function oversizedAnimatedGif(targetBytes: number): Buffer {
  const chunks: number[] = [];
  const push = (...bytes: number[]) => chunks.push(...bytes);
  // Header + logical screen descriptor (1×1, no global colour table).
  push(
    0x47,
    0x49,
    0x46,
    0x38,
    0x39,
    0x61,
    0x01,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x00,
  );
  // NETSCAPE2.0 looping extension → an animation.
  push(0x21, 0xff, 0x0b);
  for (const byte of Buffer.from("NETSCAPE2.0", "ascii")) push(byte);
  push(0x03, 0x01, 0x00, 0x00, 0x00);
  // Comment extension holding the bulk of the payload (blocks ≤ 255 bytes).
  push(0x21, 0xfe);
  let remaining = targetBytes - chunks.length - 32;
  while (remaining > 0) {
    const block = Math.min(255, remaining);
    push(block);
    for (let i = 0; i < block; i++) push(0x41);
    remaining -= block;
  }
  push(0x00);
  // Minimal 1×1 image: descriptor, LZW min code size, one data block.
  push(0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00);
  push(0x02, 0x02, 0x44, 0x01, 0x00);
  push(0x3b); // trailer
  return Buffer.from(chunks);
}

/**
 * Hold every client script request (`/_next/static/**` except stylesheets)
 * until the returned release function runs: the SSR HTML arrives and parses
 * but React cannot hydrate, so the page is in its genuine "before hydration"
 * state (the inline PE script from React still works — it ships in the HTML).
 *
 * Stylesheets must NOT be held: Chrome blocks HTML parsing while a pending
 * `<link rel="stylesheet">` is in the head, so the rest of the server HTML
 * (including the form itself) would never enter the DOM — measured: with
 * CSS gated, body stalls at 4956 chars / no heading / no input while
 * responseEnd=328ms; with CSS exempt, body=39308, heading visible,
 * input present, data-ready still null.
 */
export async function gateClientChunks(
  page: Page,
): Promise<() => Promise<void>> {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let released = false;
  // Exactly one continue per request. Before release() any double continue
  // is a logic bug and must fail loudly; after release() Playwright may
  // pre-handle paused routes during unroute — only THAT specific error is
  // benign there. Every other error always propagates.
  const continueOnce = async (route: Route) => {
    try {
      await route.continue();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (released && message.includes("Route is already handled")) return;
      throw error;
    }
  };
  const inFlight = new Set<Promise<void>>();
  const handler = (route: Route) => {
    const run = (async () => {
      if (/\.css(\?|$)/.test(route.request().url())) {
        await continueOnce(route);
        return;
      }
      await gate;
      await continueOnce(route);
    })();
    inFlight.add(run);
    void run.finally(() => inFlight.delete(run));
    return run;
  };
  await page.route("**/_next/static/**", handler);
  return async () => {
    released = true;
    release();
    // Let every resumed handler finish its single continue BEFORE unroute.
    while (inFlight.size > 0) await Promise.allSettled([...inFlight]);
    await page.unroute("**/_next/static/**", handler);
  };
}

/**
 * >targetBytes of garbage behind a JPEG SOI marker: Chrome cannot decode it,
 * while the size check still sees an oversize file — the exact input for
 * "heavy file that cannot be compressed" scenarios.
 */
export function oversizedJunkJpeg(targetBytes: number): Buffer {
  const bytes = Buffer.alloc(targetBytes, 0x5a);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  bytes[3] = 0xe0;
  return bytes;
}

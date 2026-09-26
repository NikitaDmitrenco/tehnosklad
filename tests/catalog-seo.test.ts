import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag }));

import {
  catalogCacheTags,
  revalidateCatalogAfterMutation,
} from "@/features/catalog/cache";
import { serializeJsonLd } from "@/features/seo/json-ld";
import { buildLocalizedMetadata } from "@/features/seo/metadata";

describe("catalog SEO foundations", () => {
  beforeEach(() => revalidateTag.mockClear());

  it("emits canonical, hreflang, social and noindex metadata together", () => {
    const metadata = buildLocalizedMetadata({
      locale: "ro",
      title: "Frigidere",
      description: "Catalog",
      currentPath: "/ro/category/frigidere",
      alternatePath: "/ru/category/refrigerators",
      index: false,
    });

    expect(metadata.alternates).toEqual({
      canonical: "/ro/category/frigidere",
      languages: {
        ru: "/ru/category/refrigerators",
        ro: "/ro/category/frigidere",
        "x-default": "/ru/category/refrigerators",
      },
    });
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
    expect(metadata.openGraph).toMatchObject({ locale: "ro_MD" });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("escapes script-breaking JSON-LD characters", () => {
    const serialized = serializeJsonLd({ value: "</script>\u2028line\u2029" });
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script>");
    expect(serialized).toContain("\\u2028");
    expect(serialized).toContain("\\u2029");
  });

  it("invalidates only the cache tags affected by a mutation", () => {
    revalidateCatalogAfterMutation("product");
    expect(revalidateTag.mock.calls).toEqual([
      [catalogCacheTags.catalog, { expire: 0 }],
      [catalogCacheTags.products, { expire: 0 }],
    ]);
  });
});

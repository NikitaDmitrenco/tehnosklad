import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CatalogDataError } from "@/features/catalog/repository";
import { SupabaseCatalogTransport } from "@/features/catalog/supabase/transport";

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
  count?: number | null;
};

// Supabase answers a ranged request with the rows of that range and the total
// count, so the fake serves slices of `result.data` the same way.
function queryBuilder(result: QueryResult) {
  const calls: Array<[string, unknown]> = [];
  let range: [number, number] | null = null;
  const paged = (): QueryResult => {
    if (!range || !Array.isArray(result.data)) return result;
    const [from, to] = range;
    return { ...result, data: result.data.slice(from, to + 1) };
  };
  const builder = {
    select(value: string, options?: { count?: string }) {
      calls.push(["select", value]);
      if (options?.count) calls.push(["count", options.count]);
      return builder;
    },
    range(from: number, to: number) {
      calls.push(["range", [from, to]]);
      range = [from, to];
      return builder;
    },
    order(value: string) {
      calls.push(["order", value]);
      return builder;
    },
    eq(column: string, value: unknown) {
      calls.push([`eq:${column}`, value]);
      return builder;
    },
    neq(column: string, value: unknown) {
      calls.push([`neq:${column}`, value]);
      return builder;
    },
    is(column: string, value: unknown) {
      calls.push([`is:${column}`, value]);
      return builder;
    },
    limit(value: number) {
      calls.push(["limit", value]);
      return builder;
    },
    in(column: string, value: unknown) {
      calls.push([`in:${column}`, value]);
      return builder;
    },
    maybeSingle() {
      calls.push(["maybeSingle", true]);
      return Promise.resolve(result);
    },
    then(resolve: (value: QueryResult) => unknown) {
      return Promise.resolve(resolve(paged()));
    },
  };
  return { builder, calls };
}

function clientFor(...builders: ReturnType<typeof queryBuilder>["builder"][]) {
  let index = 0;
  return {
    from: vi.fn(() => builders[Math.min(index++, builders.length - 1)]),
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.test/${path}` },
        }),
      })),
    },
  } as unknown as SupabaseClient;
}

describe("Supabase catalog transport", () => {
  it("filters category lists to published, non-archived rows", async () => {
    const query = queryBuilder({ data: [], error: null });
    const transport = new SupabaseCatalogTransport(clientFor(query.builder));

    await transport.listCategories();

    expect(query.calls).toEqual(
      expect.arrayContaining([
        ["eq:is_published", true],
        ["is:archived_at", null],
      ]),
    );
  });

  it("applies category, exclusion and limit before mapping public URLs", async () => {
    const product = {
      id: "product",
      product_images: [{ id: "image", storage_path: "product/image.webp" }],
    };
    const query = queryBuilder({ data: [product], error: null });
    const transport = new SupabaseCatalogTransport(clientFor(query.builder));

    const rows = await transport.listProducts({
      categoryId: "category",
      excludeId: "current",
      limit: 3,
    });

    expect(query.calls).toEqual(
      expect.arrayContaining([
        ["eq:is_published", true],
        ["is:archived_at", null],
        ["eq:category_id", "category"],
        ["neq:id", "current"],
        ["limit", 3],
      ]),
    );
    expect(rows[0]!.product_images[0]!.public_url).toBe(
      "https://cdn.test/product/image.webp",
    );
  });

  it("sanitizes Supabase query errors", async () => {
    const query = queryBuilder({
      data: null,
      error: { message: "sensitive database detail" },
    });
    const transport = new SupabaseCatalogTransport(clientFor(query.builder));
    await expect(transport.listProducts()).rejects.toEqual(
      new CatalogDataError(
        "query_failed",
        "Supabase query failed for products",
      ),
    );
  });

  it("logs the database cause the thrown error withholds", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const query = queryBuilder({
      data: null,
      error: { message: "sensitive database detail" },
    });
    const transport = new SupabaseCatalogTransport(clientFor(query.builder));

    await expect(transport.listProducts()).rejects.toBeInstanceOf(
      CatalogDataError,
    );

    expect(logged).toHaveBeenCalledWith(
      "Supabase catalog query error",
      expect.objectContaining({
        resource: "products",
        message: "sensitive database detail",
      }),
    );
    logged.mockRestore();
  });

  it("sends product ids to the specification query in bounded batches", async () => {
    // A single `in` filter carries every id in the URL, so the whole catalog
    // at once outgrows what the proxy in front of PostgREST accepts.
    const query = queryBuilder({ data: [], error: null, count: 0 });
    const transport = new SupabaseCatalogTransport(clientFor(query.builder));

    await transport.listSpecifications(
      Array.from({ length: 250 }, (_, index) => `product-${index}`),
    );

    expect(
      query.calls
        .filter(([method]) => method === "in:product_id")
        .map(([, value]) => (value as string[]).length),
    ).toEqual([100, 100, 50]);
  });

  it("pages an unbounded product list past the PostgREST row ceiling", async () => {
    const rows = Array.from({ length: 1500 }, (_, index) => ({
      id: `product-${index}`,
      product_images: [],
    }));
    const query = queryBuilder({ data: rows, error: null, count: rows.length });
    const transport = new SupabaseCatalogTransport(clientFor(query.builder));

    await expect(transport.listProducts()).resolves.toHaveLength(rows.length);

    expect(
      query.calls
        .filter(([method]) => method === "range")
        .map(([, value]) => value),
    ).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(query.calls).toContainEqual(["count", "exact"]);
  });

  it("resolves a product by localized slug before its targeted entity query", async () => {
    const lookup = queryBuilder({
      data: { product_id: "product" },
      error: null,
    });
    const entity = queryBuilder({
      data: {
        id: "product",
        product_images: [{ id: "image", storage_path: "product/image.webp" }],
      },
      error: null,
    });
    const transport = new SupabaseCatalogTransport(
      clientFor(lookup.builder, entity.builder),
    );

    const row = await transport.findProductBySlug("ro", "produs-localizat");

    expect(lookup.calls).toEqual(
      expect.arrayContaining([
        ["eq:locale", "ro"],
        ["eq:slug", "produs-localizat"],
        ["maybeSingle", true],
      ]),
    );
    expect(entity.calls).toEqual(
      expect.arrayContaining([
        ["eq:id", "product"],
        ["eq:is_published", true],
        ["is:archived_at", null],
        ["maybeSingle", true],
      ]),
    );
    expect(row?.product_images[0]!.public_url).toBe(
      "https://cdn.test/product/image.webp",
    );
  });

  it("does not query a category entity when the localized slug is absent", async () => {
    const lookup = queryBuilder({ data: null, error: null });
    const client = clientFor(lookup.builder);
    const transport = new SupabaseCatalogTransport(client);
    await expect(
      transport.findCategoryBySlug("ru", "missing"),
    ).resolves.toBeNull();
    expect(client.from).toHaveBeenCalledTimes(1);
    expect(lookup.calls).toEqual(
      expect.arrayContaining([
        ["eq:locale", "ru"],
        ["eq:slug", "missing"],
      ]),
    );
  });

  it("filters a category entity resolved from a localized slug", async () => {
    const lookup = queryBuilder({
      data: { category_id: "category" },
      error: null,
    });
    const entity = queryBuilder({ data: { id: "category" }, error: null });
    const transport = new SupabaseCatalogTransport(
      clientFor(lookup.builder, entity.builder),
    );

    await transport.findCategoryBySlug("ru", "category");

    expect(entity.calls).toEqual(
      expect.arrayContaining([
        ["eq:id", "category"],
        ["eq:is_published", true],
        ["is:archived_at", null],
        ["maybeSingle", true],
      ]),
    );
  });

  it("requests product category bindings in the specification bulk query", async () => {
    const query = queryBuilder({ data: [], error: null });
    const transport = new SupabaseCatalogTransport(clientFor(query.builder));
    await transport.listSpecifications(["product"]);
    const select = query.calls.find(([method]) => method === "select")?.[1];
    expect(select).toEqual(
      expect.stringContaining("products!inner(category_id)"),
    );
    expect(select).toEqual(expect.stringContaining("category_attributes("));
    expect(query.calls).toContainEqual(["in:product_id", ["product"]]);
  });

  it("reads only ids and slugs for the sitemap", async () => {
    const query = queryBuilder({ data: [], error: null, count: 0 });
    const transport = new SupabaseCatalogTransport(clientFor(query.builder));

    await transport.listProductSlugs();

    const select = query.calls.find(([method]) => method === "select")?.[1];
    expect(select).toBe("id,product_translations(locale,slug)");
    expect(query.calls).toEqual(
      expect.arrayContaining([
        ["eq:is_published", true],
        ["is:archived_at", null],
      ]),
    );
  });

  it("asks Postgres for the filter document instead of folding it here", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        brands: ["LG"],
        availability: ["in_stock"],
        min_price_minor: 100,
        max_price_minor: 100,
        attributes: [],
      },
      error: null,
    });
    const transport = new SupabaseCatalogTransport({
      rpc,
    } as unknown as SupabaseClient);

    await expect(transport.getFacets("ro", "category")).resolves.toMatchObject({
      brands: ["LG"],
    });
    expect(rpc).toHaveBeenCalledWith("get_public_catalog_facets", {
      p_locale: "ro",
      p_category_id: "category",
    });
  });

  it("asks for catalog-wide filters when no category is given", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null });
    const transport = new SupabaseCatalogTransport({
      rpc,
    } as unknown as SupabaseClient);

    await transport.getFacets("ru");

    expect(rpc).toHaveBeenCalledWith("get_public_catalog_facets", {
      p_locale: "ru",
      p_category_id: null,
    });
  });

  it("passes bounded server-search parameters to the catalog RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ product_id: "product", total_count: "12" }],
      error: null,
    });
    const client = {
      rpc,
    } as unknown as SupabaseClient;
    const transport = new SupabaseCatalogTransport(client);

    await expect(
      transport.searchProductIds("ru", "category", {
        query: "Nord",
        brand: "Nord",
        availability: "in_stock",
        minPriceMinor: 100,
        maxPriceMinor: 500000,
        attributes: { energy_class: "a_plus" },
        sort: "price_asc",
        page: 2,
        pageSize: 9,
      }),
    ).resolves.toEqual({ ids: ["product"], total: 12 });
    expect(rpc).toHaveBeenCalledWith("search_public_catalog_product_ids", {
      p_locale: "ru",
      p_category_id: "category",
      p_query: "Nord",
      p_brand: "Nord",
      p_availability: "in_stock",
      p_min_price_minor: 100,
      p_max_price_minor: 500000,
      p_attributes: { energy_class: "a_plus" },
      p_sort: "price_asc",
      p_limit: 9,
      p_offset: 9,
    });
  });
});

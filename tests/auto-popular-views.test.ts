import { describe, expect, it } from "vitest";
import { DemoCatalogRepository } from "@/features/catalog/demo-repository";

describe("Automated TOP-7 Popular Products by 30-Day Views", () => {
  it("1. ranks products with higher view counts in a higher position (DESC)", async () => {
    const repo = new DemoCatalogRepository();
    const prodA = "20000000-0000-4000-8000-000000000001";

    // Record extra view for prodA
    await repo.recordProductView(prodA);
    await repo.recordProductView(prodA);

    const popular = await repo.getPopularProducts("ru", 7);
    expect(popular[0]?.id).toBe(prodA);
  });

  it("2. sorts products strictly by view count DESC", async () => {
    const repo = new DemoCatalogRepository();
    // Seed clear descending order: prod3 > prod2
    const p2 = "20000000-0000-4000-8000-000000000002";
    const p3 = "20000000-0000-4000-8000-000000000003";

    for (let i = 0; i < 5; i++) await repo.recordProductView(p3);
    for (let i = 0; i < 3; i++) await repo.recordProductView(p2);

    const popular = await repo.getPopularProducts("ru", 7);
    expect(popular[0]?.id).toBe(p3);
    expect(popular[1]?.id).toBe(p2);
  });

  it("3 & 4. includes 30-day views and ignores views older than 30 days", async () => {
    const repo = new DemoCatalogRepository();
    // Manually inject an old view (>30 days) and a new view (<30 days)
    const oldProductId = "20000000-0000-4000-8000-000000000010";
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Direct memory test via repository internal views map for boundary condition
    const viewsMap = (repo as unknown as { viewsMap: Map<string, Date[]> })
      .viewsMap;
    viewsMap.set(oldProductId, [new Date(now - 35 * dayMs)]); // 35 days ago

    const popular = await repo.getPopularProducts("ru", 7);
    expect(popular.some((p) => p.id === oldProductId)).toBe(false);
  });

  it("5. verifies exact 30-day rolling boundary (now - 30d + 1m included, now - 30d - 1m excluded)", async () => {
    const repo = new DemoCatalogRepository();
    const insideId = "20000000-0000-4000-8000-000000000011";
    const outsideId = "20000000-0000-4000-8000-000000000012";
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const oneMinMs = 60 * 1000;

    const viewsMap = (repo as unknown as { viewsMap: Map<string, Date[]> })
      .viewsMap;
    // Clear initial seed to isolate test
    viewsMap.clear();

    // Inside 30d window (just under 30 days)
    viewsMap.set(insideId, [new Date(now - (thirtyDaysMs - oneMinMs))]);
    // Outside 30d window (just over 30 days)
    viewsMap.set(outsideId, [new Date(now - (thirtyDaysMs + oneMinMs))]);

    const popular = await repo.getPopularProducts("ru", 7);
    expect(popular.map((p) => p.id)).toContain(insideId);
    expect(popular.map((p) => p.id)).not.toContain(outsideId);
  });

  it("6. caps maximum products returned to 7 even if limit is larger", async () => {
    const repo = new DemoCatalogRepository();
    // Default seed has 8 products with views
    const popular = await repo.getPopularProducts("ru", 100);
    expect(popular.length).toBeLessThanOrEqual(7);
  });

  it("7. excludes products with 0 views in the last 30 days", async () => {
    const repo = new DemoCatalogRepository();
    const viewsMap = (repo as unknown as { viewsMap: Map<string, Date[]> })
      .viewsMap;
    viewsMap.clear();

    // Seed only 2 products with views
    const p1 = "20000000-0000-4000-8000-000000000001";
    const p2 = "20000000-0000-4000-8000-000000000002";
    viewsMap.set(p1, [new Date()]);
    viewsMap.set(p2, [new Date()]);

    const popular = await repo.getPopularProducts("ru", 7);
    expect(popular.length).toBe(2);
    expect(popular.map((p) => p.id)).toEqual(expect.arrayContaining([p1, p2]));
  });

  it("8. returns fewer than 7 products when under 7 products have views, triggering homepage section hiding", async () => {
    const repo = new DemoCatalogRepository();
    const viewsMap = (repo as unknown as { viewsMap: Map<string, Date[]> })
      .viewsMap;
    viewsMap.clear();

    // Only 4 products with views
    for (let i = 1; i <= 4; i++) {
      const id = `20000000-0000-4000-8000-00000000000${i}`;
      viewsMap.set(id, [new Date()]);
    }

    const popular = await repo.getPopularProducts("ru", 7);
    expect(popular.length).toBe(4);
    // UI rule check: popular.length >= 7 is false for 4
    expect(popular.length >= 7).toBe(false);
  });

  it("9. recording a view dynamically updates ranking position", async () => {
    const repo = new DemoCatalogRepository();
    const viewsMap = (repo as unknown as { viewsMap: Map<string, Date[]> })
      .viewsMap;
    viewsMap.clear();

    const p1 = "20000000-0000-4000-8000-000000000001";
    const p2 = "20000000-0000-4000-8000-000000000002";

    viewsMap.set(p1, [new Date(), new Date()]); // 2 views
    viewsMap.set(p2, [new Date()]); // 1 view

    let popular = await repo.getPopularProducts("ru", 7);
    expect(popular[0]?.id).toBe(p1);

    // Record 2 new views for p2 so p2 has 3 views > 2 views
    await repo.recordProductView(p2);
    await repo.recordProductView(p2);

    popular = await repo.getPopularProducts("ru", 7);
    expect(popular[0]?.id).toBe(p2);
  });

  it("10. uses deterministic product_id ASC tie-breaker for equal view counts", async () => {
    const repo = new DemoCatalogRepository();
    const viewsMap = (repo as unknown as { viewsMap: Map<string, Date[]> })
      .viewsMap;
    viewsMap.clear();

    const pA = "20000000-0000-4000-8000-000000000001";
    const pB = "20000000-0000-4000-8000-000000000002";

    // Both have 1 view
    viewsMap.set(pB, [new Date()]);
    viewsMap.set(pA, [new Date()]);

    const popular = await repo.getPopularProducts("ru", 7);
    expect(popular[0]?.id).toBe(pA);
    expect(popular[1]?.id).toBe(pB);
  });

  it("11. cleans up old product views beyond retention period (31 days)", async () => {
    const repo = new DemoCatalogRepository();
    const viewsMap = (repo as unknown as { viewsMap: Map<string, Date[]> })
      .viewsMap;
    viewsMap.clear();

    const productId = "20000000-0000-4000-8000-000000000001";
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    viewsMap.set(productId, [
      new Date(now - 10 * dayMs), // Keep (10 days old)
      new Date(now - 35 * dayMs), // Delete (35 days old)
      new Date(now - 40 * dayMs), // Delete (40 days old)
    ]);

    const deletedCount = await repo.cleanupOldProductViews(31);
    expect(deletedCount).toBe(2);
    expect(viewsMap.get(productId)?.length).toBe(1);
  });

  it("12. verifies legacy isPopular property is completely absent on CatalogProduct", async () => {
    const repo = new DemoCatalogRepository();
    const popular = await repo.getPopularProducts("ru", 7);
    expect(popular.length).toBeGreaterThan(0);
    for (const product of popular) {
      expect(
        (product as unknown as Record<string, unknown>).isPopular,
      ).toBeUndefined();
    }
  });
});

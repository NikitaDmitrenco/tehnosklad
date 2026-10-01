import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  altTextLimit,
  assistantKnowledgeLimits,
  attributeGroupLimits,
  attributeLimits,
  categoryLimits,
  imageLimits,
  productLimits,
  seoLimits,
  siteSettingValueLimit,
} from "@/lib/limits";

// The migrations are the authority: if a CHECK constraint and src/lib/limits.ts
// disagree, the UI accepts input the database rejects (or vice versa) and the
// user sees a generic error instead of the real limit.
const root = resolve(__dirname, "..");
const initialSql = readFileSync(
  resolve(root, "supabase/migrations/20260805111516_initial_schema.sql"),
  "utf8",
);
const completionSql = readFileSync(
  resolve(
    root,
    "supabase/migrations/20260806053422_stage_6_7_completion_security.sql",
  ),
  "utf8",
);
const integritySql = readFileSync(
  resolve(root, "supabase/verification/integrity.sql"),
  "utf8",
);
const configToml = readFileSync(resolve(root, "supabase/config.toml"), "utf8");

function tableBlock(sql: string, table: string): string {
  const start = sql.indexOf(`create table public.${table} (`);
  if (start < 0) throw new Error(`table ${table} not found`);
  const end = sql.indexOf("\n);", start);
  if (end < 0) throw new Error(`table ${table} not terminated`);
  return sql.slice(start, end);
}

function columnMax(block: string, column: string): number {
  const match = block.match(
    new RegExp(
      `char_length\\(${column}\\)\\s*(?:between 1 and (\\d+)|<= (\\d+))`,
    ),
  );
  if (!match) throw new Error(`no char_length check for ${column}`);
  return Number(match[1] ?? match[2]);
}

function bucketConfig(
  sql: string,
  id: string,
): { size: number; mimeTypes: string[] } {
  const match = sql.match(
    new RegExp(
      String.raw`'${id}',\s*'${id}',\s*(?:true|false),\s*(\d+),\s*array\[([^\]]+)\]`,
      "m",
    ),
  );
  if (!match) throw new Error(`bucket ${id} insert not found`);
  return {
    size: Number(match[1]),
    mimeTypes: [...match[2]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!),
  };
}

describe("limits stay in sync with the database", () => {
  it("category translation limits match CHECK constraints", () => {
    const block = tableBlock(initialSql, "category_translations");
    expect(columnMax(block, "name")).toBe(categoryLimits.name);
    expect(columnMax(block, "slug")).toBe(categoryLimits.slug);
    expect(columnMax(block, "short_description")).toBe(
      categoryLimits.shortDescription,
    );
    expect(columnMax(block, "description")).toBe(categoryLimits.description);
    expect(columnMax(block, "seo_title")).toBe(seoLimits.title.max);
    expect(columnMax(block, "seo_description")).toBe(seoLimits.description.max);
  });

  it("product translation limits match CHECK constraints", () => {
    const block = tableBlock(initialSql, "product_translations");
    expect(columnMax(block, "name")).toBe(productLimits.name);
    expect(columnMax(block, "slug")).toBe(productLimits.slug);
    expect(columnMax(block, "short_description")).toBe(
      productLimits.shortDescription,
    );
    expect(columnMax(block, "description")).toBe(productLimits.description);
    expect(columnMax(block, "seo_title")).toBe(seoLimits.title.max);
    expect(columnMax(block, "seo_description")).toBe(seoLimits.description.max);
  });

  it("product column limits match CHECK constraints", () => {
    const block = tableBlock(initialSql, "products");
    expect(columnMax(block, "brand")).toBe(productLimits.brand);
    expect(columnMax(block, "model")).toBe(productLimits.model);
    expect(columnMax(block, "sku")).toBe(productLimits.sku);
  });

  it("image alt text limit matches the CHECK constraint", () => {
    const block = tableBlock(initialSql, "product_image_translations");
    expect(columnMax(block, "alt_text")).toBe(altTextLimit);
  });

  it("attribute limits match CHECK constraints", () => {
    expect(
      columnMax(tableBlock(initialSql, "attribute_translations"), "name"),
    ).toBe(attributeLimits.name);
    expect(
      columnMax(tableBlock(initialSql, "attribute_translations"), "help_text"),
    ).toBe(attributeLimits.helpText);
    expect(
      columnMax(tableBlock(initialSql, "attribute_translations"), "unit_label"),
    ).toBe(attributeLimits.unitLabel);
    expect(
      columnMax(
        tableBlock(initialSql, "attribute_option_translations"),
        "label",
      ),
    ).toBe(attributeLimits.optionLabel);
    expect(
      columnMax(
        tableBlock(initialSql, "product_attribute_value_translations"),
        "text_value",
      ),
    ).toBe(attributeLimits.textValue);
    expect(
      columnMax(tableBlock(initialSql, "attribute_group_translations"), "name"),
    ).toBe(attributeGroupLimits.name);
  });

  it("settings and assistant knowledge limits match CHECK constraints", () => {
    expect(columnMax(tableBlock(initialSql, "site_settings"), "value")).toBe(
      siteSettingValueLimit,
    );
    expect(
      columnMax(tableBlock(completionSql, "assistant_knowledge"), "title"),
    ).toBe(assistantKnowledgeLimits.title);
    expect(
      columnMax(tableBlock(completionSql, "assistant_knowledge"), "content"),
    ).toBe(assistantKnowledgeLimits.content);
  });

  it("image limits sit below both storage buckets and the local stack", () => {
    const productImages = bucketConfig(initialSql, "product-images");
    const categoryImages = bucketConfig(completionSql, "category-images");
    expect(productImages.mimeTypes).toEqual([...imageLimits.mimeTypes]);
    expect(categoryImages.mimeTypes).toEqual([...imageLimits.mimeTypes]);
    expect(productImages.size).toBe(categoryImages.size);
    expect(imageLimits.maxBytes).toBeLessThanOrEqual(productImages.size);
    expect(imageLimits.extensions).toHaveLength(imageLimits.mimeTypes.length);

    // integrity.sql asserts the same bucket configuration on every harness run.
    const integrity = integritySql.match(
      /file_size_limit = (\d+)[\s\S]*?array\[([^\]]+)\]/,
    );
    expect(integrity).not.toBeNull();
    expect(Number(integrity![1])).toBe(productImages.size);
    expect([...integrity![2]!.matchAll(/'([^']+)'/g)].map((m) => m[1])).toEqual(
      productImages.mimeTypes,
    );

    // Local storage service must accept at least what the buckets accept.
    const local = configToml.match(/file_size_limit = "(\d+)(\w+)"/);
    expect(local).not.toBeNull();
    const unit =
      local![2] === "MiB" ? 1024 * 1024 : local![2] === "KiB" ? 1024 : 1;
    expect(Number(local![1]) * unit).toBeGreaterThanOrEqual(
      imageLimits.maxBytes,
    );
  });
});

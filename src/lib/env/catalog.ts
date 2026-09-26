import { EnvironmentConfigurationError } from "@/lib/env/shared";

export type CatalogDataSource = "demo" | "supabase";

export function parseCatalogDataSource(
  value: string | undefined,
  nodeEnvironment: string | undefined,
): CatalogDataSource {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "demo") {
    if (nodeEnvironment === "production") {
      throw new EnvironmentConfigurationError(["CATALOG_DATA_SOURCE"]);
    }
    return "demo";
  }
  if (normalized === "supabase") return normalized;
  if (normalized)
    throw new EnvironmentConfigurationError(["CATALOG_DATA_SOURCE"]);
  if (nodeEnvironment === "development" || nodeEnvironment === "test") {
    return "demo";
  }
  throw new EnvironmentConfigurationError(["CATALOG_DATA_SOURCE"]);
}

export function getCatalogDataSource(): CatalogDataSource {
  return parseCatalogDataSource(
    process.env.CATALOG_DATA_SOURCE,
    process.env.NODE_ENV,
  );
}

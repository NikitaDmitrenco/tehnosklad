import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  callAdminRpc: vi.fn(),
  revalidateCatalog: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/features/admin/auth/guard", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/features/admin/repository", () => ({
  callAdminRpc: mocks.callAdminRpc,
  adminClientForStorage: vi.fn(),
  getAdminProduct: vi.fn(),
  listAdminAttributes: vi.fn(),
  scanAdminProductOrphans: vi.fn(),
}));
vi.mock("@/features/catalog/cache", () => ({
  revalidateCatalogAfterMutation: mocks.revalidateCatalog,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { saveCategoryAction } from "@/features/admin/actions";

function categoryForm() {
  const form = new FormData();
  form.set("presentation_key", "generic");
  form.set("sort_order", "10");
  for (const locale of ["ru", "ro"]) {
    form.set(`${locale}_name`, `${locale} name`);
    form.set(`${locale}_slug`, `${locale}-slug`);
    form.set(`${locale}_short_description`, `${locale} short`);
    form.set(`${locale}_description`, `${locale} description`);
  }
  return form;
}

describe("admin mutation authorization and cache invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin", role: "admin" });
    mocks.callAdminRpc.mockResolvedValue({
      data: "10000000-0000-4000-8000-000000000001",
    });
  });

  it("guards before mutation and invalidates category cache after success", async () => {
    await expect(saveCategoryAction(categoryForm())).rejects.toThrow(
      "REDIRECT:/admin/categories/10000000-0000-4000-8000-000000000001?saved=1",
    );
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.callAdminRpc).toHaveBeenCalledOnce();
    expect(mocks.revalidateCatalog).toHaveBeenCalledWith("category");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/categories");
  });

  it("does not touch repository or cache when authorization fails", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("not-admin"));
    await expect(saveCategoryAction(categoryForm())).rejects.toThrow(
      "not-admin",
    );
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
    expect(mocks.revalidateCatalog).not.toHaveBeenCalled();
  });

  it("does not invalidate cache when the database mutation fails", async () => {
    mocks.callAdminRpc.mockRejectedValueOnce(new Error("database failure"));
    await expect(saveCategoryAction(categoryForm())).rejects.toThrow(
      /error=operation_failed/,
    );
    expect(mocks.revalidateCatalog).not.toHaveBeenCalled();
  });
});

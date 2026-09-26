import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { SupabaseCatalogRepository } from "@/features/catalog/supabase/repository";
import { SupabaseCatalogTransport } from "@/features/catalog/supabase/transport";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing integration environment: ${name}`);
  return value;
}

function assertLocalApiUrl(value: string) {
  const parsed = new URL(value);
  if (
    !["localhost", "127.0.0.1"].includes(parsed.hostname) ||
    parsed.port !== "54321"
  ) {
    throw new Error("Integration tests refuse a non-local Supabase URL");
  }
}

function assertLocalSiteUrl(value: string) {
  const parsed = new URL(value);
  if (
    parsed.protocol !== "http:" ||
    !["localhost", "127.0.0.1"].includes(parsed.hostname) ||
    parsed.port !== "3100" ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("Integration tests refuse a non-local application URL");
  }
}

function resultData<T extends { data: unknown; error: unknown }>(
  result: T,
  operation: string,
): T["data"] {
  if (result.error) {
    const message =
      typeof result.error === "object" &&
      result.error !== null &&
      "message" in result.error &&
      typeof result.error.message === "string"
        ? result.error.message
        : "unknown error";
    throw new Error(`${operation} failed: ${message}`);
  }
  return result.data;
}

function assertNoError(result: { error: unknown }, operation: string) {
  if (result.error) throw new Error(`${operation} failed`);
}

class CookieJar {
  readonly values = new Map<string, string>();

  absorb(response: Response) {
    const headers = response.headers as Headers & {
      getSetCookie?: () => string[];
    };
    const cookies =
      headers.getSetCookie?.() ??
      (response.headers.get("set-cookie")
        ? [response.headers.get("set-cookie")!]
        : []);
    for (const cookie of cookies) {
      const [pair] = cookie.split(";", 1);
      const separator = pair!.indexOf("=");
      if (separator < 1) continue;
      const name = pair!.slice(0, separator);
      const value = pair!.slice(separator + 1);
      if (!value || /(?:^|;)\s*max-age=0(?:;|$)/i.test(cookie)) {
        this.values.delete(name);
      } else {
        this.values.set(name, value);
      }
    }
  }

  header(): string {
    return [...this.values]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  expireAccessToken(): boolean {
    const authNames = [...this.values.keys()].filter((name) =>
      /-auth-token(?:\.\d+)?$/.test(name),
    );
    if (!authNames.length) return false;
    const baseName = authNames[0]!.replace(/\.\d+$/, "");
    const ordered = authNames.toSorted((left, right) => {
      const index = (name: string) =>
        name === baseName ? 0 : Number(name.match(/\.(\d+)$/)?.[1] ?? 0);
      return index(left) - index(right);
    });
    const encoded = ordered.map((name) => this.values.get(name) ?? "").join("");
    if (!encoded.startsWith("base64-")) return false;
    try {
      const session = JSON.parse(
        Buffer.from(encoded.slice("base64-".length), "base64url").toString(
          "utf8",
        ),
      ) as Record<string, unknown>;
      session.expires_at = 1;
      session.expires_in = 0;
      const expired = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
      ordered.forEach((name) => this.values.delete(name));
      const chunkSize = 3_000;
      if (expired.length <= chunkSize) {
        this.values.set(baseName, expired);
      } else {
        for (
          let offset = 0, chunk = 0;
          offset < expired.length;
          offset += chunkSize, chunk += 1
        ) {
          this.values.set(
            `${baseName}.${chunk}`,
            expired.slice(offset, offset + chunkSize),
          );
        }
      }
      return true;
    } catch {
      return false;
    }
  }
}

function serverActionId(html: string): string {
  const match = html.match(/name="(\$ACTION_ID_[^"]+)"/);
  if (!match?.[1]) throw new Error("Server Action identifier was not rendered");
  return match[1];
}

const apiUrl = requiredEnvironment("TEST_SUPABASE_URL");
const publishableKey = requiredEnvironment("TEST_SUPABASE_PUBLISHABLE_KEY");
const serviceRoleKey = requiredEnvironment("TEST_SUPABASE_SERVICE_ROLE_KEY");
const siteUrl = requiredEnvironment("TEST_SITE_URL");
assertLocalApiUrl(apiUrl);
assertLocalSiteUrl(siteUrl);
if (process.env.TEHNOSKLAD_LOCAL_TEST !== "1") {
  throw new Error("Explicit local-test flag is missing");
}

const runId = randomUUID();
const runIpPrefix = `198.18.${20 + (Number.parseInt(runId.slice(0, 2), 16) % 200)}`;
const runPhoneSeed = (Number.parseInt(runId.slice(2, 8), 16) % 100_000)
  .toString()
  .padStart(5, "0");
const publishedCategoryId = "10000000-0000-4000-8000-000000000001";
const publishedProductId = "20000000-0000-4000-8000-000000000001";
const slugHistoryProductId = "20000000-0000-4000-8000-000000000002";
const slugHistoryCategoryId = "10000000-0000-4000-8000-000000000002";
const fixture = {
  draftCategoryId: randomUUID(),
  draftProductId: randomUUID(),
  archivedProductId: randomUUID(),
  adminEmail: `stage35-admin-${runId}@example.test`,
  nonAdminEmail: `stage35-user-${runId}@example.test`,
  inactiveEmail: `stage35-inactive-${runId}@example.test`,
  adminPassword: `Stage35!A-${randomUUID()}`,
  nonAdminPassword: `Stage35!U-${randomUUID()}`,
  inactivePassword: `Stage35!I-${randomUUID()}`,
};

const service = createClient(apiUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let adminId = "";
let nonAdminId = "";
let inactiveId = "";
const storagePaths: string[] = [];
const leadRequestIds: string[] = [];

type RuntimeLeadPayload = {
  name: string;
  phone: string;
  telegram?: string;
  comment?: string;
  consent: boolean;
  locale: "ru" | "ro";
  source:
    | "home_contact"
    | "contacts_page"
    | "home_product_card"
    | "catalog_product_card"
    | "category_product_card"
    | "product_page"
    | "similar_product_card";
  sourcePath: string;
  productId?: string;
  companyWebsite?: string;
};

async function postLead(
  payload: RuntimeLeadPayload,
  options: { requestId?: string; address?: string; origin?: string } = {},
) {
  const requestId = options.requestId ?? randomUUID();
  leadRequestIds.push(requestId);
  const response = await fetch(`${siteUrl}/api/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: options.origin ?? siteUrl,
      "Idempotency-Key": requestId,
      "X-Vercel-Forwarded-For": options.address ?? "198.51.100.10",
    },
    body: JSON.stringify(payload),
  });
  return { response, requestId };
}

function publicClient(): SupabaseClient {
  return createClient(apiUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createUser(email: string, password: string): Promise<string> {
  const data = resultData(
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "admin" },
    }),
    "create local Auth user",
  );
  if (!data.user?.id) throw new Error("Local Auth user has no id");
  return data.user.id;
}

async function signIn(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const client = publicClient();
  resultData(
    await client.auth.signInWithPassword({ email, password }),
    "local Auth sign in",
  );
  return client;
}

async function applicationLogin(
  email: string,
  password: string,
  next = "/admin",
) {
  const jar = new CookieJar();
  const loginPage = await fetch(`${siteUrl}/admin/login`, {
    redirect: "manual",
  });
  jar.absorb(loginPage);
  const html = await loginPage.text();
  const form = new FormData();
  form.set(serverActionId(html), "");
  form.set("email", email);
  form.set("password", password);
  form.set("next", next);
  const response = await fetch(`${siteUrl}/admin/login`, {
    method: "POST",
    body: form,
    redirect: "manual",
    headers: { Origin: siteUrl, Cookie: jar.header() },
  });
  jar.absorb(response);
  return { jar, response };
}

beforeAll(async () => {
  adminId = await createUser(fixture.adminEmail, fixture.adminPassword);
  nonAdminId = await createUser(
    fixture.nonAdminEmail,
    fixture.nonAdminPassword,
  );
  inactiveId = await createUser(
    fixture.inactiveEmail,
    fixture.inactivePassword,
  );

  resultData(
    await service.from("profiles").insert([
      { id: adminId, display_name: "Runtime Admin", is_active: true },
      { id: nonAdminId, display_name: "Runtime User", is_active: true },
      { id: inactiveId, display_name: "Inactive Admin", is_active: false },
    ]),
    "create runtime profiles",
  );
  resultData(
    await service.from("user_roles").insert([
      { user_id: adminId, role: "admin" },
      { user_id: inactiveId, role: "admin" },
    ]),
    "create runtime roles",
  );

  resultData(
    await service.from("categories").insert({
      id: fixture.draftCategoryId,
      presentation_key: "generic",
      sort_order: 999,
      is_published: false,
    }),
    "create draft category",
  );
  resultData(
    await service.from("category_translations").insert([
      {
        category_id: fixture.draftCategoryId,
        locale: "ru",
        name: "Черновая категория",
        slug: `runtime-draft-category-${runId}`,
        short_description: "Черновик",
        description: "Черновик",
      },
      {
        category_id: fixture.draftCategoryId,
        locale: "ro",
        name: "Categorie schiță",
        slug: `runtime-draft-category-ro-${runId}`,
        short_description: "Schiță",
        description: "Schiță",
      },
    ]),
    "create draft category translations",
  );

  resultData(
    await service.from("products").insert([
      {
        id: fixture.draftProductId,
        category_id: publishedCategoryId,
        brand: "Runtime",
        model: "Draft",
        sku: `RUNTIME-DRAFT-${runId}`,
        price_minor: 10000,
        is_published: false,
        sort_order: 998,
      },
      {
        id: fixture.archivedProductId,
        category_id: publishedCategoryId,
        brand: "Runtime",
        model: "Archived",
        sku: `RUNTIME-ARCHIVED-${runId}`,
        price_minor: 20000,
        is_published: false,
        archived_at: new Date().toISOString(),
        sort_order: 999,
      },
    ]),
    "create draft products",
  );
  resultData(
    await service.from("product_translations").insert([
      {
        product_id: fixture.draftProductId,
        locale: "ru",
        name: "Черновой товар",
        slug: `runtime-draft-product-${runId}`,
        short_description: "Черновик",
        description: "Черновик",
      },
      {
        product_id: fixture.draftProductId,
        locale: "ro",
        name: "Produs schiță",
        slug: `runtime-draft-product-ro-${runId}`,
        short_description: "Schiță",
        description: "Schiță",
      },
      {
        product_id: fixture.archivedProductId,
        locale: "ru",
        name: "Архивный товар",
        slug: `runtime-archived-product-${runId}`,
        short_description: "Архив",
        description: "Архив",
      },
      {
        product_id: fixture.archivedProductId,
        locale: "ro",
        name: "Produs arhivat",
        slug: `runtime-archived-product-ro-${runId}`,
        short_description: "Arhivă",
        description: "Arhivă",
      },
    ]),
    "create draft product translations",
  );
});

afterAll(async () => {
  const cleanupErrors: string[] = [];
  const cleanup = async (
    operation: string,
    action: () => PromiseLike<{ data: unknown; error: unknown }>,
  ) => {
    try {
      resultData(await action(), operation);
    } catch (error) {
      cleanupErrors.push(
        `${operation}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  };
  if (storagePaths.length) {
    await cleanup("remove runtime Storage objects", () =>
      service.storage.from("product-images").remove([...new Set(storagePaths)]),
    );
  }
  if (leadRequestIds.length) {
    await cleanup("remove runtime leads", () =>
      service
        .from("leads")
        .delete()
        .in("client_request_id", [...new Set(leadRequestIds)]),
    );
  }
  await cleanup("remove runtime product slug routes", () =>
    service
      .from("product_slug_routes")
      .delete()
      .in("product_id", [fixture.draftProductId, fixture.archivedProductId]),
  );
  await cleanup("remove runtime products", () =>
    service
      .from("products")
      .delete()
      .in("id", [fixture.draftProductId, fixture.archivedProductId]),
  );
  await cleanup("remove runtime category slug routes", () =>
    service
      .from("category_slug_routes")
      .delete()
      .eq("category_id", fixture.draftCategoryId),
  );
  await cleanup("remove runtime category", () =>
    service.from("categories").delete().eq("id", fixture.draftCategoryId),
  );
  for (const userId of [adminId, nonAdminId, inactiveId].filter(Boolean)) {
    await cleanup(`remove runtime Auth user ${userId}`, () =>
      service.auth.admin.deleteUser(userId),
    );
  }
  if (cleanupErrors.length) {
    throw new Error(`Integration cleanup failed:\n${cleanupErrors.join("\n")}`);
  }
});

describe.sequential("real local catalog repository", () => {
  it("maps the deterministic seed in both languages without demo fallback", async () => {
    const repository = new SupabaseCatalogRepository(
      new SupabaseCatalogTransport(publicClient()),
    );
    const [ruCategories, roCategories, ruProducts, roProducts] =
      await Promise.all([
        repository.getPublishedCategories("ru"),
        repository.getPublishedCategories("ro"),
        repository.getPublishedProducts("ru"),
        repository.getPublishedProducts("ro"),
      ]);
    expect(ruCategories).toHaveLength(3);
    expect(roCategories).toHaveLength(3);
    expect(ruProducts).toHaveLength(12);
    expect(roProducts).toHaveLength(12);
    expect(ruCategories.map((category) => category.presentationKey)).toEqual([
      "fridge",
      "stove",
      "vacuum",
    ]);
    expect(ruProducts[0]!.name).toContain("Холодильник");
    expect(roProducts[0]!.name).toContain("Frigider");
    expect(
      roProducts[0]!.specifications.some(
        (item) => item.displayValue === "două compartimente",
      ),
    ).toBe(true);

    const product = await repository.getProductBySlug("ru", "nord-cool-300");
    expect(product).toMatchObject({ id: publishedProductId, currency: "MDL" });
    const similar = await repository.getSimilarProducts(
      "ro",
      publishedProductId,
      publishedCategoryId,
      3,
    );
    expect(similar).toHaveLength(3);
    expect(similar.every((item) => item.id !== publishedProductId)).toBe(true);
    await expect(
      repository.getProductBySlug("ru", `runtime-draft-product-${runId}`),
    ).resolves.toBeNull();
    await expect(
      repository.getProductBySlug("ru", `runtime-archived-product-${runId}`),
    ).resolves.toBeNull();
    await expect(repository.getPublicSiteSettings("ro")).resolves.toMatchObject(
      {
        phoneDisplay: "+373 69 166 172",
        address: expect.stringContaining("Comrat"),
      },
    );
  });

  it("searches, filters and paginates through the public RPC", async () => {
    const repository = new SupabaseCatalogRepository(
      new SupabaseCatalogTransport(publicClient()),
    );
    const baseQuery = {
      query: "",
      brand: null,
      availability: null,
      minPriceMinor: null,
      maxPriceMinor: null,
      attributes: {},
      sort: "popular" as const,
      page: 1,
      pageSize: 5,
    };
    const secondPage = await repository.searchPublishedProducts(
      "ru",
      undefined,
      { ...baseQuery, page: 2 },
    );
    expect(secondPage).toMatchObject({
      total: 12,
      page: 2,
      pageSize: 5,
      pageCount: 3,
    });
    expect(secondPage.products).toHaveLength(5);

    const nord = await repository.searchPublishedProducts("ro", undefined, {
      ...baseQuery,
      brand: "Nord",
      pageSize: 9,
    });
    expect(nord.total).toBeGreaterThan(0);
    expect(nord.products.every((product) => product.brand === "Nord")).toBe(
      true,
    );

    const drafts = await repository.searchPublishedProducts("ru", undefined, {
      ...baseQuery,
      brand: "Runtime",
      pageSize: 9,
    });
    expect(drafts).toMatchObject({ total: 0, products: [] });

    const capacity = await repository.searchPublishedProducts(
      "ru",
      publishedCategoryId,
      {
        ...baseQuery,
        attributes: { capacity: "capacity" },
        pageSize: 9,
      },
    );
    expect(capacity).toMatchObject({
      total: 4,
    });
    expect(
      capacity.products.every(
        (product) => product.category.id === publishedCategoryId,
      ),
    ).toBe(true);
  });
});

describe.sequential("real local RLS roles", () => {
  it("keeps anon read-only and hides draft and archived rows", async () => {
    const anon = publicClient();
    const products = resultData(
      await anon.from("products").select("id"),
      "anon product read",
    );
    expect(products).toHaveLength(12);
    const write = await anon.from("products").insert({
      id: randomUUID(),
      category_id: publishedCategoryId,
      brand: "Denied",
      model: "Denied",
      sku: `ANON-DENIED-${runId}`,
      price_minor: 100,
    });
    expect(write.error).not.toBeNull();
  });

  it("does not treat authenticated metadata or self-assignment as admin", async () => {
    const user = await signIn(fixture.nonAdminEmail, fixture.nonAdminPassword);
    const products = resultData(
      await user.from("products").select("id"),
      "non-admin product read",
    );
    expect(products).toHaveLength(12);
    const ownProfile = resultData(
      await user.from("profiles").select("id,is_active").eq("id", nonAdminId),
      "own profile read",
    );
    expect(ownProfile).toHaveLength(1);
    const roles = resultData(
      await user.from("user_roles").select("user_id"),
      "own role read",
    );
    expect(roles).toHaveLength(0);
    expect(
      (
        await user
          .from("user_roles")
          .insert({ user_id: nonAdminId, role: "admin" })
      ).error,
    ).not.toBeNull();
    const profileUpdate = await user
      .from("profiles")
      .update({ is_active: false })
      .eq("id", nonAdminId)
      .select("id");
    expect(profileUpdate.error).toBeNull();
    expect(profileUpdate.data).toEqual([]);
    const unchangedProfile = resultData(
      await service
        .from("profiles")
        .select("is_active")
        .eq("id", nonAdminId)
        .single(),
      "verify denied profile update",
    );
    expect(unchangedProfile).toMatchObject({ is_active: true });
  });

  it("allows an active database admin to manage drafts", async () => {
    const admin = await signIn(fixture.adminEmail, fixture.adminPassword);
    const products = resultData(
      await admin.from("products").select("id"),
      "admin product read",
    );
    expect(products).toHaveLength(14);
    const update = await admin
      .from("products")
      .update({ model: "Draft verified" })
      .eq("id", fixture.draftProductId)
      .select("model")
      .single();
    expect(resultData(update, "admin draft update")).toMatchObject({
      model: "Draft verified",
    });
  });

  it("revokes admin RLS immediately when the profile is inactive", async () => {
    const inactive = await signIn(
      fixture.inactiveEmail,
      fixture.inactivePassword,
    );
    const products = resultData(
      await inactive.from("products").select("id"),
      "inactive admin public read",
    );
    expect(products).toHaveLength(12);
    const deniedUpdate = await inactive
      .from("products")
      .update({ model: "Denied" })
      .eq("id", fixture.draftProductId)
      .select("id");
    expect(deniedUpdate.error).toBeNull();
    expect(deniedUpdate.data).toEqual([]);
  });
});

describe.sequential("real local Auth and Storage", () => {
  it("logs in, refreshes and logs out a real local Auth session", async () => {
    const client = publicClient();
    const invalid = await client.auth.signInWithPassword({
      email: fixture.adminEmail,
      password: "definitely-wrong",
    });
    expect(invalid.error).not.toBeNull();
    const signup = await client.auth.signUp({
      email: `must-not-sign-up-${runId}@example.test`,
      password: fixture.nonAdminPassword,
    });
    expect(signup.error).not.toBeNull();
    const signedIn = resultData(
      await client.auth.signInWithPassword({
        email: fixture.adminEmail,
        password: fixture.adminPassword,
      }),
      "Auth sign in",
    );
    expect(signedIn.session?.refresh_token).toBeTruthy();
    const refreshed = resultData(
      await client.auth.refreshSession({
        refresh_token: signedIn.session!.refresh_token,
      }),
      "Auth refresh",
    );
    expect(refreshed.session?.access_token).toBeTruthy();
    assertNoError(
      await client.auth.signOut({ scope: "local" }),
      "Auth sign out",
    );
    const session = resultData(
      await client.auth.getSession(),
      "Auth get session",
    );
    expect(session.session).toBeNull();
  });

  it("enforces admin-only immutable Storage with path, MIME and size limits", async () => {
    const anon = publicClient();
    const nonAdmin = await signIn(
      fixture.nonAdminEmail,
      fixture.nonAdminPassword,
    );
    const admin = await signIn(fixture.adminEmail, fixture.adminPassword);
    const smallImage = new Blob([new Uint8Array([82, 73, 70, 70])], {
      type: "image/webp",
    });
    const unsupportedMimeImage = new Blob([new Uint8Array([71, 73, 70, 56])], {
      type: "image/gif",
    });
    const validPath = `${publishedProductId}/${randomUUID()}.webp`;
    storagePaths.push(validPath);

    expect(
      (
        await anon.storage
          .from("product-images")
          .upload(validPath, smallImage, { contentType: "image/webp" })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await nonAdmin.storage
          .from("product-images")
          .upload(validPath, smallImage, { contentType: "image/webp" })
      ).error,
    ).not.toBeNull();
    resultData(
      await admin.storage.from("product-images").upload(validPath, smallImage, {
        contentType: "image/webp",
        upsert: false,
      }),
      "admin Storage upload",
    );

    expect(
      (
        await admin.storage
          .from("product-images")
          .upload(validPath, smallImage, {
            contentType: "image/webp",
            upsert: true,
          })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await admin.storage
          .from("product-images")
          .update(validPath, smallImage, { contentType: "image/webp" })
      ).error,
    ).not.toBeNull();
    const nestedPath = `${publishedProductId}/nested/${randomUUID()}.webp`;
    const invalidMimePath = `${publishedProductId}/${randomUUID()}.webp`;
    const invalidExtensionPath = `${publishedProductId}/${randomUUID()}.gif`;
    const foreignProductPath = `${randomUUID()}/${randomUUID()}.webp`;
    storagePaths.push(
      nestedPath,
      invalidMimePath,
      invalidExtensionPath,
      foreignProductPath,
    );
    expect(
      (
        await admin.storage
          .from("product-images")
          .upload(nestedPath, smallImage, { contentType: "image/webp" })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await admin.storage
          .from("product-images")
          .upload(invalidMimePath, unsupportedMimeImage, {
            contentType: "image/gif",
          })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await admin.storage
          .from("product-images")
          .upload(invalidExtensionPath, smallImage, {
            contentType: "image/webp",
          })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await admin.storage
          .from("product-images")
          .upload(foreignProductPath, smallImage, {
            contentType: "image/webp",
          })
      ).error,
    ).not.toBeNull();

    const maxPath = `${publishedProductId}/${randomUUID()}.webp`;
    storagePaths.push(maxPath);
    resultData(
      await admin.storage
        .from("product-images")
        .upload(
          maxPath,
          new Blob([new Uint8Array(5 * 1024 * 1024)], { type: "image/webp" }),
          { contentType: "image/webp" },
        ),
      "maximum-size Storage upload",
    );
    const oversizedPath = `${publishedProductId}/${randomUUID()}.webp`;
    storagePaths.push(oversizedPath);
    expect(
      (
        await admin.storage.from("product-images").upload(
          oversizedPath,
          new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], {
            type: "image/webp",
          }),
          { contentType: "image/webp" },
        )
      ).error,
    ).not.toBeNull();

    resultData(
      await anon.storage.from("product-images").download(validPath),
      "public Storage download",
    );
    const anonymousList = resultData(
      await anon.storage.from("product-images").list(publishedProductId),
      "anonymous Storage list",
    );
    expect(anonymousList).toEqual([]);
    const deniedDelete = resultData(
      await nonAdmin.storage.from("product-images").remove([validPath]),
      "non-admin Storage delete",
    );
    expect(deniedDelete).toEqual([]);
    resultData(
      await anon.storage.from("product-images").download(validPath),
      "verify denied Storage delete",
    );
    const deleted = resultData(
      await admin.storage.from("product-images").remove([validPath, maxPath]),
      "admin Storage delete",
    );
    expect(deleted).toHaveLength(2);
    for (const deletedPath of [validPath, maxPath]) {
      expect(
        (await anon.storage.from("product-images").download(deletedPath)).error,
      ).not.toBeNull();
    }
    storagePaths.splice(
      0,
      storagePaths.length,
      ...storagePaths.filter((path) => path !== validPath && path !== maxPath),
    );
  });
});

describe.sequential("production HTTP and application Auth", () => {
  it("persists a product lead once and records a durable Telegram outcome", async () => {
    const payload: RuntimeLeadPayload = {
      name: "Иван Тестовый",
      phone: `+373 69 ${runPhoneSeed}1`,
      telegram: "@runtime_test",
      comment: "Нужна доставка",
      consent: true,
      locale: "ru",
      source: "product_page",
      sourcePath: "/ru/product/nord-cool-300",
      productId: publishedProductId,
    };
    const { response, requestId } = await postLead(payload, {
      address: `${runIpPrefix}.41`,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });

    const lead = resultData(
      await service
        .from("leads")
        .select(
          "id,name,phone,product_name_snapshot,product_price_minor,product_currency,product_path_snapshot",
        )
        .eq("client_request_id", requestId)
        .single(),
      "read persisted runtime lead",
    );
    if (!lead) throw new Error("Persisted runtime lead is missing");
    expect(lead).toMatchObject({
      name: "Иван Тестовый",
      phone: `+37369${runPhoneSeed}1`,
      product_name_snapshot: "Холодильник Nord Cool 300",
      product_price_minor: 789000,
      product_currency: "MDL",
      product_path_snapshot: "/ru/product/nord-cool-300",
    });

    const [history, delivery] = await Promise.all([
      service
        .from("lead_status_history")
        .select("status")
        .eq("lead_id", lead.id),
      service
        .from("lead_telegram_deliveries")
        .select("id,state,attempt_count,last_error_code")
        .eq("lead_id", lead.id)
        .single(),
    ]);
    expect(resultData(history, "read lead history")).toEqual([
      { status: "new" },
    ]);
    const deliveryRow = resultData(delivery, "read Telegram delivery");
    if (!deliveryRow) throw new Error("Runtime Telegram delivery is missing");
    expect(deliveryRow).toMatchObject({
      state: "permanent_failure",
      attempt_count: 1,
      last_error_code: "telegram_config_missing",
    });
    const attemptRows = resultData(
      await service
        .from("lead_delivery_attempts")
        .select("outcome,error_code,provider_http_status")
        .eq("delivery_id", deliveryRow.id),
      "read Telegram delivery attempt",
    );
    expect(attemptRows).toEqual([
      {
        outcome: "permanent_failure",
        error_code: "telegram_config_missing",
        provider_http_status: null,
      },
    ]);
    const repeated = await postLead(payload, {
      requestId,
      address: `${runIpPrefix}.41`,
    });
    expect(repeated.response.status).toBe(200);
    const repeatedCount = await service
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("client_request_id", requestId);
    assertNoError(repeatedCount, "count idempotent runtime leads");
    expect(repeatedCount.count).toBe(1);

    const conflicting = await postLead(
      { ...payload, name: "Другой клиент" },
      { requestId, address: `${runIpPrefix}.41` },
    );
    expect(conflicting.response.status).toBe(409);

    const anonRead = await publicClient().from("leads").select("id");
    expect(anonRead.error).not.toBeNull();
    const admin = await signIn(fixture.adminEmail, fixture.adminPassword);
    const adminRead = resultData(
      await admin.from("leads").select("id").eq("id", lead.id),
      "admin lead read",
    );
    expect(adminRead).toHaveLength(1);
  });

  it("rejects invalid, forged-origin and unavailable-product submissions", async () => {
    const base: RuntimeLeadPayload = {
      name: "Мария Тестовая",
      phone: `+37369${runPhoneSeed}2`,
      consent: true,
      locale: "ru",
      source: "contacts_page",
      sourcePath: "/ru/contacts",
    };

    const honeypot = await postLead(
      { ...base, companyWebsite: "https://spam.example" },
      { address: `${runIpPrefix}.42` },
    );
    expect(honeypot.response.status).toBe(202);
    const honeypotRows = resultData(
      await service
        .from("leads")
        .select("id")
        .eq("client_request_id", honeypot.requestId),
      "check honeypot lead absence",
    );
    expect(honeypotRows).toHaveLength(0);

    const invalid = await postLead(
      { ...base, phone: "12", consent: false },
      { address: `${runIpPrefix}.43` },
    );
    expect(invalid.response.status).toBe(422);
    expect(await invalid.response.json()).toMatchObject({
      ok: false,
      code: "validation_error",
    });

    const forged = await postLead(base, {
      address: `${runIpPrefix}.44`,
      origin: "https://evil.example",
    });
    expect(forged.response.status).toBe(403);

    const draft = await postLead(
      {
        ...base,
        phone: `+37369${runPhoneSeed}3`,
        source: "product_page",
        sourcePath: `/ru/product/runtime-draft-product-${runId}`,
        productId: fixture.draftProductId,
      },
      { address: `${runIpPrefix}.45` },
    );
    expect(draft.response.status).toBe(422);
    expect(await draft.response.json()).toMatchObject({
      fieldErrors: { product: "invalid" },
    });
  });

  it("rate-limits repeated submissions by a privacy-preserving IP hash", async () => {
    const address = `${runIpPrefix}.99`;
    for (let index = 0; index < 5; index += 1) {
      const created = await postLead(
        {
          name: `Клиент Лимит ${index}`,
          phone: `+37369${runPhoneSeed}${index}`,
          consent: true,
          locale: "ru",
          source: "home_contact",
          sourcePath: "/ru",
        },
        { address },
      );
      expect(created.response.status, `submission ${index + 1}`).toBe(201);
    }
    const limited = await postLead(
      {
        name: "Клиент Лимит Шесть",
        phone: `+37369${runPhoneSeed}6`,
        consent: true,
        locale: "ru",
        source: "home_contact",
        sourcePath: "/ru",
      },
      { address },
    );
    expect(limited.response.status).toBe(429);
    expect(limited.response.headers.get("retry-after")).toBe("900");
    expect(await limited.response.json()).toMatchObject({
      code: "rate_limited",
    });
  });

  it("permanently redirects historical product and category slugs", async () => {
    const productSlug = `vesta-fresh-280-${runId}`;
    const categorySlug = `stoves-${runId}`;
    try {
      resultData(
        await service
          .from("product_translations")
          .update({ slug: productSlug })
          .eq("product_id", slugHistoryProductId)
          .eq("locale", "ru"),
        "change runtime product slug",
      );
      resultData(
        await service
          .from("category_translations")
          .update({ slug: categorySlug })
          .eq("category_id", slugHistoryCategoryId)
          .eq("locale", "ru"),
        "change runtime category slug",
      );

      const oldProduct = await fetch(`${siteUrl}/ru/product/vesta-fresh-280`, {
        redirect: "manual",
      });
      expect(oldProduct.status).toBe(308);
      expect(oldProduct.headers.get("location")).toBe(
        `/ru/product/${productSlug}`,
      );
      const oldCategory = await fetch(`${siteUrl}/ru/category/stoves`, {
        redirect: "manual",
      });
      expect(oldCategory.status).toBe(308);
      expect(oldCategory.headers.get("location")).toBe(
        `/ru/category/${categorySlug}`,
      );
    } finally {
      assertNoError(
        await service
          .from("product_translations")
          .update({ slug: "vesta-fresh-280" })
          .eq("product_id", slugHistoryProductId)
          .eq("locale", "ru"),
        "restore runtime product slug",
      );
      assertNoError(
        await service
          .from("category_translations")
          .update({ slug: "stoves" })
          .eq("category_id", slugHistoryCategoryId)
          .eq("locale", "ru"),
        "restore runtime category slug",
      );
      assertNoError(
        await service
          .from("product_slug_routes")
          .delete()
          .eq("product_id", slugHistoryProductId)
          .eq("slug", productSlug),
        "remove runtime product slug history",
      );
      assertNoError(
        await service
          .from("category_slug_routes")
          .delete()
          .eq("category_id", slugHistoryCategoryId)
          .eq("slug", categorySlug),
        "remove runtime category slug history",
      );
    }
  });

  it("serves RU/RO catalog routes and fails closed for drafts and unknown slugs", async () => {
    const root = await fetch(siteUrl, { redirect: "manual" });
    expect([307, 308]).toContain(root.status);
    expect(root.headers.get("location")).toBe("/ru");

    for (const [path, marker, locale] of [
      ["/ru", "Холодильники", "ru"],
      ["/ro", "Frigidere", "ro"],
      ["/ru/catalog", "Каталог", "ru"],
      ["/ro/catalog", "Catalog", "ro"],
      ["/ru/category/refrigerators", "Холодильники", "ru"],
      ["/ro/category/refrigerators", "Frigidere", "ro"],
      ["/ru/product/nord-cool-300", "Nord Cool 300", "ru"],
      ["/ro/product/nord-cool-300", "Nord Cool 300", "ro"],
    ] as const) {
      const response = await fetch(`${siteUrl}${path}`);
      expect(response.status, path).toBe(200);
      const html = await response.text();
      expect(html, path).toContain(`lang="${locale}"`);
      expect(html, path).toContain(marker);
      if (path === "/ru") {
        expect(html).toContain("product-illustration--coral");
        expect(html).toContain("product-illustration--mint");
      }
    }

    for (const path of [
      "/ru/product/missing",
      "/ru/category/missing",
      `/ru/product/runtime-draft-product-${runId}`,
      `/ru/product/runtime-archived-product-${runId}`,
      "/en",
    ]) {
      expect((await fetch(`${siteUrl}${path}`)).status, path).toBe(404);
    }

    const canonicalized = await fetch(
      `${siteUrl}/ru/catalog?page=01&sort=popular`,
      { redirect: "manual" },
    );
    expect([200, 307]).toContain(canonicalized.status);
    if (canonicalized.status === 307) {
      expect(canonicalized.headers.get("location")).toBe("/ru/catalog");
    } else {
      expect(await canonicalized.text()).toContain(
        'rel="canonical" href="http://127.0.0.1:3100/ru/catalog"',
      );
    }

    const filtered = await fetch(`${siteUrl}/ru/catalog?q=Nord`);
    expect(filtered.status).toBe(200);
    const filteredHtml = await filtered.text();
    expect(filteredHtml).toContain('name="robots" content="noindex, follow"');
    expect(filteredHtml).toContain("Nord Cool 300");

    const searchAlias = await fetch(`${siteUrl}/ro/search?q=Nord`, {
      redirect: "manual",
    });
    expect(searchAlias.status).toBe(308);
    expect(searchAlias.headers.get("location")).toBe("/ro/catalog?q=Nord");
  });

  it("serves localized SEO discovery routes and structured data", async () => {
    const product = await fetch(`${siteUrl}/ru/product/nord-cool-300`);
    const html = await product.text();
    expect(product.status).toBe(200);
    expect(html).toContain(
      'rel="canonical" href="http://127.0.0.1:3100/ru/product/nord-cool-300"',
    );
    expect(html).toContain('hrefLang="ro"');
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type":"Product"');

    const robots = await fetch(`${siteUrl}/robots.txt`);
    expect(robots.status).toBe(200);
    expect(await robots.text()).toContain(
      "Sitemap: http://127.0.0.1:3100/sitemap.xml",
    );

    const sitemap = await fetch(`${siteUrl}/sitemap.xml`);
    const sitemapXml = await sitemap.text();
    expect(sitemap.status).toBe(200);
    expect(sitemapXml).toContain("/ru/product/nord-cool-300");
    expect(sitemapXml).toContain('hreflang="ro"');
    expect(sitemapXml).not.toContain("/privacy");

    const image = await fetch(`${siteUrl}/ro/opengraph-image`);
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toContain("image/png");
  });

  it("protects the admin route, performs real login and logout, and keeps responses private", async () => {
    const anonymous = await fetch(`${siteUrl}/admin`, { redirect: "manual" });
    expect(anonymous.status).toBe(307);
    expect(anonymous.headers.get("location")).toContain(
      "/admin/login?next=%2Fadmin",
    );
    expect(anonymous.headers.get("cache-control")).toContain("no-store");

    const { jar, response: login } = await applicationLogin(
      fixture.adminEmail,
      fixture.adminPassword,
      "https://evil.example/admin",
    );
    expect(login.status).toBe(303);
    expect(login.headers.get("location")).toBe("/admin");
    expect(jar.values.size).toBeGreaterThan(0);
    expect(jar.expireAccessToken()).toBe(true);

    const dashboard = await fetch(`${siteUrl}/admin`, {
      headers: { Cookie: jar.header() },
      redirect: "manual",
    });
    const refreshedCookies =
      (
        dashboard.headers as Headers & { getSetCookie?: () => string[] }
      ).getSetCookie?.() ?? [];
    expect(
      refreshedCookies.some((cookie) => cookie.includes("-auth-token")),
    ).toBe(true);
    jar.absorb(dashboard);
    expect(dashboard.status).toBe(200);
    expect(dashboard.headers.get("cache-control")).toContain("no-store");
    const dashboardHtml = await dashboard.text();
    expect(dashboardHtml).toContain(fixture.adminEmail);
    expect(dashboardHtml).toContain("Панель управления");

    const publicWithSession = await fetch(`${siteUrl}/ru`, {
      headers: { Cookie: jar.header() },
    });
    const publicSetCookies =
      (
        publicWithSession.headers as Headers & { getSetCookie?: () => string[] }
      ).getSetCookie?.() ?? [];
    expect(publicSetCookies).toHaveLength(0);

    const logoutForm = new FormData();
    logoutForm.set(serverActionId(dashboardHtml), "");
    const logout = await fetch(`${siteUrl}/admin`, {
      method: "POST",
      body: logoutForm,
      redirect: "manual",
      headers: { Origin: siteUrl, Cookie: jar.header() },
    });
    jar.absorb(logout);
    expect(logout.status).toBe(303);
    expect(logout.headers.get("location")).toBe("/admin/login");
    expect(jar.values.size).toBe(0);

    const { jar: existingSession, response: secondLogin } =
      await applicationLogin(fixture.adminEmail, fixture.adminPassword);
    expect(secondLogin.status).toBe(303);
    resultData(
      await service
        .from("profiles")
        .update({ is_active: false })
        .eq("id", adminId)
        .select("id"),
      "deactivate admin after session issuance",
    );
    const afterDeactivation = await fetch(`${siteUrl}/admin`, {
      headers: { Cookie: existingSession.header() },
      redirect: "manual",
    });
    expect(afterDeactivation.status).toBe(307);
    expect(afterDeactivation.headers.get("location")).toBe("/admin/login");
    expect(afterDeactivation.headers.get("cache-control")).toContain(
      "no-store",
    );
  });

  it("uses the same neutral application error for non-admin and inactive admin", async () => {
    for (const [email, password] of [
      [fixture.nonAdminEmail, fixture.nonAdminPassword],
      [fixture.inactiveEmail, fixture.inactivePassword],
      [fixture.adminEmail, "definitely-wrong"],
    ]) {
      const { jar, response } = await applicationLogin(email, password);
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toContain(
        "/admin/login?error=credentials&next=%2Fadmin",
      );
      expect(jar.values.size).toBe(0);
    }
  });
});

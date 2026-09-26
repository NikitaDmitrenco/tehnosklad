import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.TEHNOSKLAD_LOCAL_TEST === "1";
const suite = enabled ? describe : describe.skip;
const supabaseUrl = process.env.TEST_SUPABASE_URL ?? "";
const publishableKey = process.env.TEST_SUPABASE_PUBLISHABLE_KEY ?? "";
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? "";
const siteUrl = process.env.TEST_SITE_URL ?? "";
const runId = randomUUID().slice(0, 8);

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const fixture = {
  adminEmail: `stage6-admin-${runId}@example.test`,
  nonAdminEmail: `stage6-user-${runId}@example.test`,
  inactiveEmail: `stage6-inactive-${runId}@example.test`,
  password: `Stage6!A-${randomUUID()}`,
  categorySlugRu: `stage6-category-ru-${runId}`,
  categorySlugRo: `stage6-category-ro-${runId}`,
  productSlugRu: `stage6-product-ru-${runId}`,
  productSlugRo: `stage6-product-ro-${runId}`,
  sku: `STAGE6-${runId}`.toUpperCase(),
  attributeCode: `stage6_required_${runId.replaceAll("-", "_")}`,
  groupCode: `stage6_group_${runId.replaceAll("-", "_")}`,
};

let adminId = "";
let nonAdminId = "";
let inactiveId = "";
let categoryId = "";
let groupId = "";
let attributeId = "";
let productId = "";
let leadId = "";
let storagePath = "";
let originalSettingRu = "";
let originalSettingRo = "";

function publicClient() {
  return createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function data<T>(
  result: { data: T; error: unknown },
  label: string,
): NonNullable<T> {
  if (result.error) {
    const message =
      typeof result.error === "object" &&
      result.error &&
      "message" in result.error
        ? String(result.error.message)
        : "unknown local integration error";
    throw new Error(`${label}: ${message}`);
  }
  // Successful PostgREST mutations and void RPCs legitimately return null.
  // Call sites that require rows assert their shape after this error guard.
  return result.data as NonNullable<T>;
}

async function createUser(email: string) {
  const created = await service.auth.admin.createUser({
    email,
    password: fixture.password,
    email_confirm: true,
  });
  if (created.error)
    throw new Error(`create Stage 6 user: ${created.error.message}`);
  if (!created.data.user?.id) throw new Error("Stage 6 Auth user has no id");
  return created.data.user.id;
}

async function signIn(email: string) {
  const client = publicClient();
  const signedIn = await client.auth.signInWithPassword({
    email,
    password: fixture.password,
  });
  if (signedIn.error)
    throw new Error(`sign in Stage 6 user: ${signedIn.error.message}`);
  return client;
}

class CookieJar {
  values = new Map<string, string>();

  absorb(response: Response) {
    const cookies =
      (
        response.headers as Headers & { getSetCookie?: () => string[] }
      ).getSetCookie?.() ?? [];
    for (const cookie of cookies) {
      const [pair] = cookie.split(";", 1);
      const separator = pair!.indexOf("=");
      const name = pair!.slice(0, separator);
      const value = pair!.slice(separator + 1);
      if (/max-age=0/i.test(cookie) || value === "") this.values.delete(name);
      else this.values.set(name, value);
    }
  }

  header() {
    return [...this.values]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

function actionId(html: string, marker?: string) {
  let block = html;
  if (marker) {
    const position = html.indexOf(`data-admin-form="${marker}"`);
    if (position < 0)
      throw new Error(`Admin form marker ${marker} was not rendered`);
    const start = html.lastIndexOf("<form", position);
    const end = html.indexOf("</form>", position);
    block = html.slice(start, end);
  }
  const match = block.match(/name="(\$ACTION_ID_[^"]+)"/);
  if (!match)
    throw new Error(`Server Action id was not found for ${marker ?? "form"}`);
  return match[1]!;
}

async function applicationLogin(email: string) {
  const jar = new CookieJar();
  const page = await fetch(`${siteUrl}/admin/login`, { redirect: "manual" });
  jar.absorb(page);
  const html = await page.text();
  const form = new FormData();
  form.set(actionId(html), "");
  form.set("email", email);
  form.set("password", fixture.password);
  form.set("next", "/admin");
  const response = await fetch(`${siteUrl}/admin/login`, {
    method: "POST",
    body: form,
    redirect: "manual",
    headers: { Origin: siteUrl, Cookie: jar.header() },
  });
  jar.absorb(response);
  return { jar, response };
}

async function postAdminForm(
  jar: CookieJar,
  path: string,
  marker: string,
  form: FormData,
) {
  const page = await fetch(`${siteUrl}${path}`, {
    headers: { Cookie: jar.header() },
    redirect: "manual",
  });
  expect(page.status).toBe(200);
  const html = await page.text();
  form.set(actionId(html, marker), "");
  const response = await fetch(`${siteUrl}${path}`, {
    method: "POST",
    body: form,
    redirect: "manual",
    headers: { Origin: siteUrl, Cookie: jar.header() },
  });
  jar.absorb(response);
  return response;
}

function setTranslation(
  form: FormData,
  locale: "ru" | "ro",
  values: { name: string; slug: string },
) {
  form.set(`${locale}_name`, values.name);
  form.set(`${locale}_slug`, values.slug);
  form.set(`${locale}_short_description`, `${values.name} short`);
  form.set(`${locale}_description`, `${values.name} description`);
}

beforeAll(async () => {
  adminId = await createUser(fixture.adminEmail);
  nonAdminId = await createUser(fixture.nonAdminEmail);
  inactiveId = await createUser(fixture.inactiveEmail);
  data(
    await service.from("profiles").insert([
      { id: adminId, display_name: "Stage 6 Admin", is_active: true },
      { id: nonAdminId, display_name: "Stage 6 User", is_active: true },
      { id: inactiveId, display_name: "Stage 6 Inactive", is_active: false },
    ]),
    "create Stage 6 profiles",
  );
  data(
    await service.from("user_roles").insert([
      { user_id: adminId, role: "admin" },
      { user_id: inactiveId, role: "admin" },
    ]),
    "create Stage 6 roles",
  );
  const settings = data(
    await service
      .from("site_settings")
      .select("locale,value")
      .eq("key", "contact_text"),
    "read original settings",
  );
  originalSettingRu = settings.find((row) => row.locale === "ru")?.value ?? "";
  originalSettingRo = settings.find((row) => row.locale === "ro")?.value ?? "";
});

afterAll(async () => {
  if (storagePath)
    await service.storage.from("product-images").remove([storagePath]);
  if (leadId) await service.from("leads").delete().eq("id", leadId);
  if (productId) {
    await service
      .from("product_slug_routes")
      .delete()
      .eq("product_id", productId);
    await service.from("products").delete().eq("id", productId);
  }
  if (categoryId && attributeId)
    await service
      .from("category_attributes")
      .delete()
      .eq("category_id", categoryId)
      .eq("attribute_id", attributeId);
  if (attributeId)
    await service.from("attributes").delete().eq("id", attributeId);
  if (groupId)
    await service.from("attribute_groups").delete().eq("id", groupId);
  if (categoryId) {
    await service
      .from("category_slug_routes")
      .delete()
      .eq("category_id", categoryId);
    await service.from("categories").delete().eq("id", categoryId);
  }
  if (originalSettingRu && originalSettingRo)
    await service.from("site_settings").upsert([
      { key: "contact_text", locale: "ru", value: originalSettingRu },
      { key: "contact_text", locale: "ro", value: originalSettingRo },
    ]);
  for (const id of [adminId, nonAdminId, inactiveId].filter(Boolean))
    await service.auth.admin.deleteUser(id);
});

suite.sequential("Stage 6 complete admin workflow", () => {
  it("allows active admin and rejects non-admin and inactive admin", async () => {
    const active = await applicationLogin(fixture.adminEmail);
    expect(active.response.status).toBe(303);
    expect(active.response.headers.get("location")).toBe("/admin");
    expect(active.jar.values.size).toBeGreaterThan(0);
    for (const email of [fixture.nonAdminEmail, fixture.inactiveEmail]) {
      const denied = await applicationLogin(email);
      expect(denied.response.status).toBe(303);
      expect(denied.response.headers.get("location")).toContain(
        "error=credentials",
      );
      expect(denied.jar.values.size).toBe(0);
    }
  });

  it("creates, publishes, revalidates and cleans a complete catalog slice", async () => {
    const { jar } = await applicationLogin(fixture.adminEmail);
    const categoryForm = new FormData();
    categoryForm.set("presentation_key", "generic");
    categoryForm.set("sort_order", "950");
    categoryForm.set("is_published", "on");
    setTranslation(categoryForm, "ru", {
      name: "Категория Stage 6",
      slug: fixture.categorySlugRu,
    });
    setTranslation(categoryForm, "ro", {
      name: "Categorie Stage 6",
      slug: fixture.categorySlugRo,
    });
    const categoryResponse = await postAdminForm(
      jar,
      "/admin/categories/new",
      "category-save",
      categoryForm,
    );
    expect(categoryResponse.status).toBe(303);
    const categoryLocation = categoryResponse.headers.get("location") ?? "";
    categoryId =
      categoryLocation.match(/\/admin\/categories\/([0-9a-f-]{36})/)?.[1] ?? "";
    expect(categoryId).toMatch(/^[0-9a-f-]{36}$/);

    const admin = await signIn(fixture.adminEmail);
    groupId = String(
      data(
        await admin.rpc("admin_save_attribute_group", {
          p_id: null,
          p_code: fixture.groupCode,
          p_sort_order: 950,
          p_is_active: true,
          p_name_ru: "Группа Stage 6",
          p_name_ro: "Grup Stage 6",
        }),
        "create attribute group",
      ),
    );
    attributeId = String(
      data(
        await admin.rpc("admin_save_attribute", {
          p_id: null,
          p_group_id: groupId,
          p_code: fixture.attributeCode,
          p_data_type: "boolean",
          p_unit_code: null,
          p_is_filterable: true,
          p_sort_order: 950,
          p_is_active: true,
          p_ru: { name: "Обязательная проверка", helpText: "", unitLabel: "" },
          p_ro: { name: "Verificare obligatorie", helpText: "", unitLabel: "" },
        }),
        "create attribute",
      ),
    );
    data(
      await admin.rpc("admin_set_category_attribute", {
        p_category_id: categoryId,
        p_attribute_id: attributeId,
        p_enabled: true,
        p_is_required: true,
        p_is_filterable: true,
        p_sort_order: 10,
      }),
      "bind required attribute",
    );

    const productForm = new FormData();
    productForm.set("category_id", categoryId);
    productForm.set("brand", "StageBrand");
    productForm.set("model", "StageModel");
    productForm.set("sku", fixture.sku);
    productForm.set("price", "8999.50");
    productForm.set("old_price", "9999");
    productForm.set("availability", "in_stock");
    productForm.set("quantity", "2");
    productForm.set("sort_order", "950");
    setTranslation(productForm, "ru", {
      name: "Товар Stage 6",
      slug: fixture.productSlugRu,
    });
    setTranslation(productForm, "ro", {
      name: "Produs Stage 6",
      slug: fixture.productSlugRo,
    });
    const productResponse = await postAdminForm(
      jar,
      "/admin/products/new",
      "product-save",
      productForm,
    );
    expect(productResponse.status).toBe(303);
    productId =
      (productResponse.headers.get("location") ?? "").match(
        /\/admin\/products\/([0-9a-f-]{36})/,
      )?.[1] ?? "";
    expect(productId).toMatch(/^[0-9a-f-]{36}$/);
    data(
      await admin.rpc("admin_replace_product_attribute_values", {
        p_product_id: productId,
        p_values: [{ attributeId, value: "true" }],
      }),
      "save product attributes",
    );

    const imageForm = new FormData();
    imageForm.set("product_id", productId);
    imageForm.set("alt_ru", "Товар Stage 6");
    imageForm.set("alt_ro", "Produs Stage 6");
    imageForm.set("sort_order", "10");
    imageForm.set("is_primary", "on");
    imageForm.set(
      "image",
      new File(
        [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])],
        "stage6.jpg",
        { type: "image/jpeg" },
      ),
    );
    const uploadResponse = await postAdminForm(
      jar,
      `/admin/products/${productId}`,
      "image-upload",
      imageForm,
    );
    expect(uploadResponse.status).toBe(303);
    const imageRows = data(
      await service
        .from("product_images")
        .select("id,storage_path")
        .eq("product_id", productId),
      "read uploaded image metadata",
    );
    expect(imageRows).toHaveLength(1);
    storagePath = imageRows[0]!.storage_path;

    productForm.set("id", productId);
    productForm.set("is_published", "on");
    const publishResponse = await postAdminForm(
      jar,
      `/admin/products/${productId}`,
      "product-save",
      productForm,
    );
    expect(publishResponse.status).toBe(303);
    for (const path of [
      `/ru/product/${fixture.productSlugRu}`,
      `/ro/product/${fixture.productSlugRo}`,
    ]) {
      const storefront = await fetch(`${siteUrl}${path}`);
      expect(storefront.status).toBe(200);
      expect(await storefront.text()).toContain("Stage 6");
    }

    const oldProductPath = `/ru/product/${fixture.productSlugRu}`;
    productForm.set("ru_slug", `${fixture.productSlugRu}-new`);
    const editResponse = await postAdminForm(
      jar,
      `/admin/products/${productId}`,
      "product-save",
      productForm,
    );
    expect(editResponse.status).toBe(303);
    const redirected = await fetch(`${siteUrl}${oldProductPath}`, {
      redirect: "manual",
    });
    expect(redirected.status).toBe(308);
    expect(redirected.headers.get("location")).toContain(
      `${fixture.productSlugRu}-new`,
    );
    expect(
      (await fetch(`${siteUrl}/ru/product/${fixture.productSlugRu}-new`))
        .status,
    ).toBe(200);

    const submitted = data(
      await service.rpc("submit_public_lead", {
        p_client_request_id: randomUUID(),
        p_request_hash: "a".repeat(64),
        p_client_fingerprint_hash: "b".repeat(64),
        p_phone_hash: "c".repeat(64),
        p_locale: "ru",
        p_source: "product_page",
        p_source_path: `/ru/product/${fixture.productSlugRu}-new`,
        p_name: "Stage 6 Client",
        p_phone: "+37369123456",
        p_telegram_username: null,
        p_comment: "Stage 6 lead",
        p_product_id: productId,
        p_consent_version: "stage-6-integration",
      }),
      "create Stage 6 lead",
    );
    leadId = String(submitted[0]!.lead_id);
    data(
      await admin.rpc("admin_set_lead_status", {
        p_lead_id: leadId,
        p_status: "contacted",
      }),
      "change lead status",
    );
    const history = data(
      await service
        .from("lead_status_history")
        .select("status,changed_by")
        .eq("lead_id", leadId)
        .order("created_at"),
      "read lead history",
    );
    expect(history.at(-1)).toMatchObject({
      status: "contacted",
      changed_by: adminId,
    });

    const settingForm = new FormData();
    settingForm.set("key", "contact_text");
    settingForm.set("ru", `Контакт Stage 6 ${runId}`);
    settingForm.set("ro", `Contact Stage 6 ${runId}`);
    const settingResponse = await postAdminForm(
      jar,
      "/admin/settings",
      "setting-contact_text",
      settingForm,
    );
    expect(settingResponse.status).toBe(303);
    expect(
      data(
        await service
          .from("site_settings")
          .select("value")
          .eq("key", "contact_text")
          .eq("locale", "ru")
          .single(),
        "read updated setting",
      ).value,
    ).toContain(runId);

    const markedPath = String(
      data(
        await admin.rpc("admin_mark_product_image_deleting", {
          p_image_id: imageRows[0]!.id,
        }),
        "mark image deleting",
      ),
    );
    expect(markedPath).toBe(storagePath);
    data(
      await admin.storage.from("product-images").remove([storagePath]),
      "delete image object",
    );
    data(
      await admin.rpc("admin_finalize_product_image_deleting", {
        p_image_id: imageRows[0]!.id,
      }),
      "finalize image deletion",
    );
    storagePath = "";

    const archiveForm = new FormData();
    archiveForm.set("id", productId);
    archiveForm.set("archived", "true");
    expect(
      (
        await postAdminForm(
          jar,
          `/admin/products/${productId}`,
          "archive-product",
          archiveForm,
        )
      ).status,
    ).toBe(303);
    expect(
      (await fetch(`${siteUrl}/ru/product/${fixture.productSlugRu}-new`))
        .status,
    ).toBe(404);
  });
});

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/features/admin/auth/guard";
import { sanitizeAdminError } from "@/features/admin/errors";
import {
  adminClientForStorage,
  callAdminRpc,
  getAdminCategory,
  getAdminProduct,
  listAdminAttributes,
  scanAdminProductOrphans,
} from "@/features/admin/repository";
import { revalidateCatalogAfterMutation } from "@/features/catalog/cache";
import { processTelegramDelivery } from "@/features/leads/delivery";
import { createLeadStore } from "@/features/leads/repository";
import { getOptionalTelegramEnvironment } from "@/lib/env/server";
import {
  AdminValidationError,
  attributeDataType,
  checkboxValue,
  codeValue,
  createCategoryImagePath,
  createProductImagePath,
  integerValue,
  localeValue,
  moneyToMinor,
  optionalMoneyToMinor,
  optionalText,
  optionalUuidValue,
  requiredText,
  slugValue,
  uuidValue,
  validateProductImage,
} from "@/features/admin/validation";

function actionCode(error: unknown) {
  return error instanceof AdminValidationError
    ? "validation"
    : sanitizeAdminError(error).code;
}

function destination(path: string, error?: unknown) {
  const query = new URLSearchParams(
    error ? { error: actionCode(error) } : { saved: "1" },
  );
  return `${path}?${query.toString()}`;
}

function translation(
  formData: FormData,
  locale: "ru" | "ro",
  maxDescription: number,
) {
  return {
    name: requiredText(formData, `${locale}_name`, 1, 240),
    slug: slugValue(formData, `${locale}_slug`),
    shortDescription: requiredText(
      formData,
      `${locale}_short_description`,
      1,
      500,
    ),
    description: requiredText(
      formData,
      `${locale}_description`,
      1,
      maxDescription,
    ),
    seoTitle: optionalText(formData, `${locale}_seo_title`, 180) ?? "",
    seoDescription:
      optionalText(formData, `${locale}_seo_description`, 320) ?? "",
  };
}

export async function saveCategoryAction(formData: FormData): Promise<never> {
  await requireAdmin();
  const id = optionalUuidValue(formData.get("id"), "id");
  const fallback = id ? `/admin/categories/${id}` : "/admin/categories/new";
  let target = fallback;
  let error: unknown;
  try {
    const result = await callAdminRpc("admin_save_category", {
      p_id: id,
      p_parent_id: optionalUuidValue(formData.get("parent_id"), "parent_id"),
      p_presentation_key: requiredText(formData, "presentation_key", 1, 20),
      p_sort_order: integerValue(formData.get("sort_order"), "sort_order"),
      p_is_published: checkboxValue(formData, "is_published"),
      p_ru: translation(formData, "ru", 5000),
      p_ro: translation(formData, "ro", 5000),
    });
    target = `/admin/categories/${String(result.data)}`;
    revalidateCatalogAfterMutation("category");
    revalidatePath("/admin/categories");
  } catch (caught) {
    error = caught;
  }
  redirect(destination(target, error));
}

export async function setCategoryArchivedAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const id = uuidValue(formData.get("id"), "id");
  let error: unknown;
  try {
    await callAdminRpc("admin_set_category_archived", {
      p_id: id,
      p_archived: String(formData.get("archived")) === "true",
    });
    revalidateCatalogAfterMutation("category");
    revalidatePath("/admin/categories");
  } catch (caught) {
    error = caught;
  }
  redirect(destination(`/admin/categories/${id}`, error));
}

export async function uploadCategoryImageAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const categoryId = uuidValue(formData.get("category_id"), "category_id");
  let error: unknown;
  let uploadedPath: string | null = null;
  try {
    const file = formData.get("image");
    if (!(file instanceof File)) throw new AdminValidationError("image");
    const validated = await validateProductImage(file);
    const category = await getAdminCategory(categoryId);
    if (!category) throw new AdminValidationError("category_id");
    uploadedPath = createCategoryImagePath(validated.extension);
    const { supabase } = await adminClientForStorage();
    const uploaded = await supabase.storage
      .from("category-images")
      .upload(uploadedPath, file, {
        contentType: validated.mimeType,
        upsert: false,
        cacheControl: "31536000",
      });
    if (uploaded.error) throw uploaded.error;
    try {
      await callAdminRpc("admin_set_category_image", {
        p_category_id: categoryId,
        p_storage_path: uploadedPath,
      });
    } catch (metadataError) {
      await supabase.storage.from("category-images").remove([uploadedPath]);
      throw metadataError;
    }
    if (category.imageStoragePath) {
      const removed = await supabase.storage
        .from("category-images")
        .remove([category.imageStoragePath]);
      if (removed.error)
        console.error("Category image cleanup failed", {
          code: "category_image_orphan",
        });
    }
    revalidateCatalogAfterMutation("category");
    revalidatePath(`/admin/categories/${categoryId}`);
  } catch (caught) {
    error =
      caught instanceof AdminValidationError
        ? caught
        : sanitizeAdminError(caught);
  }
  redirect(destination(`/admin/categories/${categoryId}`, error));
}

export async function saveAttributeGroupAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const id = optionalUuidValue(formData.get("id"), "id");
  let target = id
    ? `/admin/attribute-groups/${id}`
    : "/admin/attribute-groups/new";
  let error: unknown;
  try {
    const result = await callAdminRpc("admin_save_attribute_group", {
      p_id: id,
      p_code: codeValue(formData, "code"),
      p_sort_order: integerValue(formData.get("sort_order"), "sort_order"),
      p_is_active: checkboxValue(formData, "is_active"),
      p_name_ru: requiredText(formData, "name_ru", 1, 160),
      p_name_ro: requiredText(formData, "name_ro", 1, 160),
    });
    target = `/admin/attribute-groups/${String(result.data)}`;
    revalidateCatalogAfterMutation("attribute");
    revalidatePath("/admin/attribute-groups");
  } catch (caught) {
    error = caught;
  }
  redirect(destination(target, error));
}

export async function deleteAttributeGroupAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const id = uuidValue(formData.get("id"), "id");
  let error: unknown;
  try {
    await callAdminRpc("admin_delete_attribute_group", { p_id: id });
    revalidateCatalogAfterMutation("attribute");
    revalidatePath("/admin/attribute-groups");
  } catch (caught) {
    error = caught;
  }
  redirect(
    destination(
      error ? `/admin/attribute-groups/${id}` : "/admin/attribute-groups",
      error,
    ),
  );
}

export async function saveAttributeAction(formData: FormData): Promise<never> {
  await requireAdmin();
  const id = optionalUuidValue(formData.get("id"), "id");
  let target = id ? `/admin/attributes/${id}` : "/admin/attributes/new";
  let error: unknown;
  try {
    const type = attributeDataType(formData.get("data_type"));
    const result = await callAdminRpc("admin_save_attribute", {
      p_id: id,
      p_group_id: optionalUuidValue(formData.get("group_id"), "group_id"),
      p_code: codeValue(formData, "code"),
      p_data_type: type,
      p_unit_code: optionalText(formData, "unit_code", 80),
      p_is_filterable:
        type === "text" ? false : checkboxValue(formData, "is_filterable"),
      p_sort_order: integerValue(formData.get("sort_order"), "sort_order"),
      p_is_active: checkboxValue(formData, "is_active"),
      p_ru: {
        name: requiredText(formData, "ru_name", 1, 160),
        helpText: optionalText(formData, "ru_help", 500) ?? "",
        unitLabel: optionalText(formData, "ru_unit", 40) ?? "",
      },
      p_ro: {
        name: requiredText(formData, "ro_name", 1, 160),
        helpText: optionalText(formData, "ro_help", 500) ?? "",
        unitLabel: optionalText(formData, "ro_unit", 40) ?? "",
      },
    });
    target = `/admin/attributes/${String(result.data)}`;
    revalidateCatalogAfterMutation("attribute");
    revalidatePath("/admin/attributes");
  } catch (caught) {
    error = caught;
  }
  redirect(destination(target, error));
}

export async function deleteAttributeAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const id = uuidValue(formData.get("id"), "id");
  let error: unknown;
  try {
    await callAdminRpc("admin_delete_attribute", { p_id: id });
    revalidateCatalogAfterMutation("attribute");
    revalidatePath("/admin/attributes");
  } catch (caught) {
    error = caught;
  }
  redirect(
    destination(error ? `/admin/attributes/${id}` : "/admin/attributes", error),
  );
}

export async function saveAttributeOptionAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const attributeId = uuidValue(formData.get("attribute_id"), "attribute_id");
  let error: unknown;
  try {
    await callAdminRpc("admin_save_attribute_option", {
      p_id: optionalUuidValue(formData.get("id"), "id"),
      p_attribute_id: attributeId,
      p_code: codeValue(formData, "code"),
      p_sort_order: integerValue(formData.get("sort_order"), "sort_order"),
      p_is_active: checkboxValue(formData, "is_active"),
      p_label_ru: requiredText(formData, "label_ru", 1, 160),
      p_label_ro: requiredText(formData, "label_ro", 1, 160),
    });
    revalidateCatalogAfterMutation("attribute");
    revalidatePath(`/admin/attributes/${attributeId}`);
  } catch (caught) {
    error = caught;
  }
  redirect(destination(`/admin/attributes/${attributeId}`, error));
}

export async function deleteAttributeOptionAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const attributeId = uuidValue(formData.get("attribute_id"), "attribute_id");
  let error: unknown;
  try {
    await callAdminRpc("admin_delete_attribute_option", {
      p_id: uuidValue(formData.get("id"), "id"),
    });
    revalidateCatalogAfterMutation("attribute");
    revalidatePath(`/admin/attributes/${attributeId}`);
  } catch (caught) {
    error = caught;
  }
  redirect(destination(`/admin/attributes/${attributeId}`, error));
}

export async function setCategoryAttributeAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const attributeId = uuidValue(formData.get("attribute_id"), "attribute_id");
  let error: unknown;
  try {
    await callAdminRpc("admin_set_category_attribute", {
      p_category_id: uuidValue(formData.get("category_id"), "category_id"),
      p_attribute_id: attributeId,
      p_enabled:
        String(formData.get("enabled_override") ?? formData.get("enabled")) ===
        "true",
      p_is_required: checkboxValue(formData, "is_required"),
      p_is_filterable: checkboxValue(formData, "is_filterable"),
      p_sort_order: integerValue(formData.get("sort_order"), "sort_order"),
    });
    revalidateCatalogAfterMutation("attribute");
    revalidatePath(`/admin/attributes/${attributeId}`);
  } catch (caught) {
    error = caught;
  }
  redirect(destination(`/admin/attributes/${attributeId}`, error));
}

export async function saveProductAction(formData: FormData): Promise<never> {
  await requireAdmin();
  const id = optionalUuidValue(formData.get("id"), "id");
  let target = id ? `/admin/products/${id}` : "/admin/products/new";
  let error: unknown;
  try {
    const priceMinor = moneyToMinor(formData.get("price"));
    const oldPriceMinor = optionalMoneyToMinor(formData.get("old_price"));
    if (oldPriceMinor !== null && BigInt(oldPriceMinor) <= BigInt(priceMinor))
      throw new AdminValidationError("old_price");
    const availability = requiredText(formData, "availability", 1, 20);
    if (!["in_stock", "out_of_stock", "on_order"].includes(availability))
      throw new AdminValidationError("availability");
    const result = await callAdminRpc("admin_save_product", {
      p_id: id,
      p_category_id: uuidValue(formData.get("category_id"), "category_id"),
      p_brand: requiredText(formData, "brand", 1, 120),
      p_model: requiredText(formData, "model", 1, 160),
      p_sku: requiredText(formData, "sku", 1, 80),
      p_price_minor: priceMinor,
      p_old_price_minor: oldPriceMinor,
      p_availability: availability,
      p_quantity: String(formData.get("quantity") ?? "").trim()
        ? integerValue(formData.get("quantity"), "quantity")
        : null,
      p_is_new: checkboxValue(formData, "is_new"),
      p_is_published: checkboxValue(formData, "is_published"),
      p_sort_order: integerValue(formData.get("sort_order"), "sort_order"),
      p_ru: translation(formData, "ru", 10_000),
      p_ro: translation(formData, "ro", 10_000),
    });
    target = `/admin/products/${String(result.data)}`;
    revalidateCatalogAfterMutation("product");
    revalidatePath("/admin/products");
  } catch (caught) {
    error = caught;
  }
  redirect(destination(target, error));
}

export async function saveProductAttributesAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const productId = uuidValue(formData.get("product_id"), "product_id");
  let error: unknown;
  try {
    const [product, attributes] = await Promise.all([
      getAdminProduct(productId),
      listAdminAttributes(),
    ]);
    if (!product) throw new AdminValidationError("product_id");
    const bound = attributes.filter((attribute) =>
      attribute.bindings.some(
        (binding) => binding.categoryId === product.categoryId,
      ),
    );
    const values: Array<Record<string, unknown>> = [];
    for (const attribute of bound) {
      const name = `attribute_${attribute.id}`;
      if (attribute.dataType === "text") {
        const ru = String(formData.get(`${name}_ru`) ?? "").trim();
        const ro = String(formData.get(`${name}_ro`) ?? "").trim();
        if (ru || ro) {
          if (!ru || !ro || ru.length > 500 || ro.length > 500)
            throw new AdminValidationError(name);
          values.push({ attributeId: attribute.id, ru, ro });
        }
      } else if (attribute.dataType === "multi_select") {
        const optionIds = formData
          .getAll(name)
          .map((value) => uuidValue(value, name));
        if (optionIds.length)
          values.push({
            attributeId: attribute.id,
            optionIds: [...new Set(optionIds)],
          });
      } else {
        const value = String(formData.get(name) ?? "").trim();
        if (!value) continue;
        if (
          attribute.dataType === "number" &&
          !/^-?\d{1,14}(?:[.,]\d{1,4})?$/.test(value)
        )
          throw new AdminValidationError(name);
        if (
          attribute.dataType === "boolean" &&
          !["true", "false"].includes(value)
        )
          throw new AdminValidationError(name);
        if (attribute.dataType === "single_select") uuidValue(value, name);
        if (attribute.dataType === "color" && !/^#[0-9a-f]{6}$/i.test(value))
          throw new AdminValidationError(name);
        values.push({
          attributeId: attribute.id,
          value: value.replace(",", "."),
        });
      }
    }
    await callAdminRpc("admin_replace_product_attribute_values", {
      p_product_id: productId,
      p_values: values,
    });
    revalidateCatalogAfterMutation("product");
    revalidatePath(`/admin/products/${productId}`);
  } catch (caught) {
    error = caught;
  }
  redirect(destination(`/admin/products/${productId}`, error));
}

export async function setProductArchivedAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const id = uuidValue(formData.get("id"), "id");
  let error: unknown;
  try {
    await callAdminRpc("admin_set_product_archived", {
      p_id: id,
      p_archived: String(formData.get("archived")) === "true",
    });
    revalidateCatalogAfterMutation("product");
    revalidatePath("/admin/products");
  } catch (caught) {
    error = caught;
  }
  redirect(destination(`/admin/products/${id}`, error));
}

export async function uploadProductImageAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const productId = uuidValue(formData.get("product_id"), "product_id");
  let error: unknown;
  let uploadedPath: string | null = null;
  try {
    const file = formData.get("image");
    if (!(file instanceof File)) throw new AdminValidationError("image");
    const validated = await validateProductImage(file);
    uploadedPath = createProductImagePath(productId, validated.extension);
    const { supabase } = await adminClientForStorage();
    const uploaded = await supabase.storage
      .from("product-images")
      .upload(uploadedPath, file, {
        contentType: validated.mimeType,
        upsert: false,
        cacheControl: "31536000",
      });
    if (uploaded.error) throw uploaded.error;
    try {
      await callAdminRpc("admin_create_product_image", {
        p_product_id: productId,
        p_storage_path: uploadedPath,
        p_alt_ru: requiredText(formData, "alt_ru", 1, 240),
        p_alt_ro: requiredText(formData, "alt_ro", 1, 240),
        p_sort_order: integerValue(formData.get("sort_order"), "sort_order"),
        p_is_primary: checkboxValue(formData, "is_primary"),
      });
    } catch (metadataError) {
      const compensation = await supabase.storage
        .from("product-images")
        .remove([uploadedPath]);
      if (compensation.error)
        console.error("Admin image compensation failed", {
          code: "orphan_object",
        });
      throw metadataError;
    }
    revalidateCatalogAfterMutation("product");
    revalidatePath(`/admin/products/${productId}`);
  } catch (caught) {
    error =
      caught instanceof AdminValidationError
        ? caught
        : sanitizeAdminError(caught);
  }
  redirect(destination(`/admin/products/${productId}`, error));
}

export async function updateProductImageAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const productId = uuidValue(formData.get("product_id"), "product_id");
  let error: unknown;
  try {
    await callAdminRpc("admin_update_product_image", {
      p_image_id: uuidValue(formData.get("image_id"), "image_id"),
      p_alt_ru: requiredText(formData, "alt_ru", 1, 240),
      p_alt_ro: requiredText(formData, "alt_ro", 1, 240),
      p_sort_order: integerValue(formData.get("sort_order"), "sort_order"),
      p_is_primary: checkboxValue(formData, "is_primary"),
    });
    revalidateCatalogAfterMutation("product");
    revalidatePath(`/admin/products/${productId}`);
  } catch (caught) {
    error = caught;
  }
  redirect(destination(`/admin/products/${productId}`, error));
}

export async function deleteProductImageAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const productId = uuidValue(formData.get("product_id"), "product_id");
  const imageId = uuidValue(formData.get("image_id"), "image_id");
  let error: unknown;
  try {
    const marked = await callAdminRpc("admin_mark_product_image_deleting", {
      p_image_id: imageId,
    });
    const trustedPath = String(marked.data);
    const { supabase } = await adminClientForStorage();
    const removed = await supabase.storage
      .from("product-images")
      .remove([trustedPath]);
    if (removed.error) {
      await callAdminRpc("admin_cancel_product_image_deleting", {
        p_image_id: imageId,
      });
      throw removed.error;
    }
    await callAdminRpc("admin_finalize_product_image_deleting", {
      p_image_id: imageId,
    });
    revalidateCatalogAfterMutation("product");
    revalidatePath(`/admin/products/${productId}`);
  } catch (caught) {
    error = caught;
  }
  redirect(destination(`/admin/products/${productId}`, error));
}

export async function cleanupOrphanImageAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  let error: unknown;
  try {
    const requestedPath = requiredText(formData, "path", 1, 500);
    if (
      !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp|avif)$/i.test(
        requestedPath,
      )
    )
      throw new AdminValidationError("path");
    const entry = (await scanAdminProductOrphans()).find(
      (candidate) =>
        candidate.path === requestedPath && candidate.state === "orphan_object",
    );
    if (!entry) throw new AdminValidationError("path");
    const { supabase } = await adminClientForStorage();
    const result = await supabase.storage
      .from("product-images")
      .remove([entry.path]);
    if (result.error) throw result.error;
    revalidatePath("/admin/media/orphans");
  } catch (caught) {
    error = caught;
  }
  redirect(destination("/admin/media/orphans", error));
}

export async function reconcileImageEntryAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  let error: unknown;
  try {
    const requestedPath = requiredText(formData, "path", 1, 500);
    const requestedState = requiredText(formData, "state", 1, 40);
    if (
      !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp|avif)$/i.test(
        requestedPath,
      )
    )
      throw new AdminValidationError("path");
    const current = (await scanAdminProductOrphans()).find(
      (candidate) =>
        candidate.path === requestedPath && candidate.state === requestedState,
    );
    if (!current) throw new AdminValidationError("path");
    const { supabase } = await adminClientForStorage();
    if (current.state === "orphan_object") {
      const removed = await supabase.storage
        .from("product-images")
        .remove([current.path]);
      if (removed.error) throw removed.error;
    } else {
      const metadata = await supabase
        .from("product_images")
        .select("id,deletion_pending_at")
        .eq("storage_path", current.path)
        .maybeSingle();
      if (metadata.error || !metadata.data)
        throw metadata.error ?? new AdminValidationError("path");
      if (current.state === "missing_object") {
        if (!metadata.data.deletion_pending_at)
          await callAdminRpc("admin_mark_product_image_deleting", {
            p_image_id: metadata.data.id,
          });
        await callAdminRpc("admin_finalize_product_image_deleting", {
          p_image_id: metadata.data.id,
        });
      } else {
        const [folder, fileName] = current.path.split("/");
        const listed = await supabase.storage
          .from("product-images")
          .list(folder, { limit: 1000 });
        if (listed.error) throw listed.error;
        if (listed.data.some((file) => file.id && file.name === fileName))
          await callAdminRpc("admin_cancel_product_image_deleting", {
            p_image_id: metadata.data.id,
          });
        else
          await callAdminRpc("admin_finalize_product_image_deleting", {
            p_image_id: metadata.data.id,
          });
      }
    }
    revalidateCatalogAfterMutation("product");
    revalidatePath("/admin/media/orphans");
  } catch (caught) {
    error = caught;
  }
  redirect(destination("/admin/media/orphans", error));
}

export async function setLeadStatusAction(formData: FormData): Promise<never> {
  await requireAdmin();
  const id = uuidValue(formData.get("lead_id"), "lead_id");
  let error: unknown;
  try {
    const status = requiredText(formData, "status", 1, 20);
    if (!["new", "in_progress", "contacted", "closed", "spam"].includes(status))
      throw new AdminValidationError("status");
    await callAdminRpc("admin_set_lead_status", {
      p_lead_id: id,
      p_status: status,
    });
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${id}`);
  } catch (caught) {
    error = caught;
  }
  redirect(destination(`/admin/leads/${id}`, error));
}

export async function retryLeadTelegramDeliveryAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const id = uuidValue(formData.get("lead_id"), "lead_id");
  let error: unknown;
  try {
    await callAdminRpc("admin_requeue_lead_telegram_delivery", {
      p_lead_id: id,
      p_confirm_uncertain: checkboxValue(formData, "confirm_uncertain"),
    });
    // This runs only after an intentional authenticated admin mutation; it is
    // never a background retry of an uncertain Telegram outcome.
    await processTelegramDelivery(
      createLeadStore(),
      getOptionalTelegramEnvironment(),
      id,
    );
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${id}`);
  } catch (caught) {
    error = caught;
  }
  redirect(destination(`/admin/leads/${id}`, error));
}

export async function saveSiteSettingAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  let error: unknown;
  try {
    const key = requiredText(formData, "key", 1, 80);
    await callAdminRpc("admin_set_public_site_setting_pair", {
      p_key: key,
      p_ru: requiredText(formData, "ru", 1, 1000),
      p_ro: requiredText(formData, "ro", 1, 1000),
    });
    revalidateCatalogAfterMutation("settings");
    revalidatePath("/admin/settings");
  } catch (caught) {
    error = caught;
  }
  redirect(destination("/admin/settings", error));
}

export async function saveAssistantKnowledgeAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const id = optionalUuidValue(formData.get("id"), "id");
  let target = id
    ? `/admin/assistant-knowledge/${id}`
    : "/admin/assistant-knowledge/new";
  let error: unknown;
  try {
    const result = await callAdminRpc("admin_save_assistant_knowledge", {
      p_id: id,
      p_locale: localeValue(formData, "locale"),
      p_title: requiredText(formData, "title", 1, 160),
      p_content: requiredText(formData, "content", 1, 5000),
      p_is_active: checkboxValue(formData, "is_active"),
    });
    target = `/admin/assistant-knowledge/${String(result.data)}`;
    revalidatePath("/admin/assistant-knowledge");
  } catch (caught) {
    error = caught;
  }
  redirect(destination(target, error));
}

export async function deleteAssistantKnowledgeAction(
  formData: FormData,
): Promise<never> {
  await requireAdmin();
  const id = uuidValue(formData.get("id"), "id");
  let error: unknown;
  try {
    await callAdminRpc("admin_delete_assistant_knowledge", { p_id: id });
    revalidatePath("/admin/assistant-knowledge");
  } catch (caught) {
    error = caught;
  }
  redirect(
    destination(
      error ? `/admin/assistant-knowledge/${id}` : "/admin/assistant-knowledge",
      error,
    ),
  );
}

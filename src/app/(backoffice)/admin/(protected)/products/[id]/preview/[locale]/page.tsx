import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/features/admin/auth/guard";
import {
  getAdminProduct,
  listAdminAttributes,
} from "@/features/admin/repository";
import { isUuid, minorToMoney } from "@/features/admin/validation";

export const dynamic = "force-dynamic";

export default async function AdminProductPreview({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  await requireAdmin();
  const { id, locale } = await params;
  if (!isUuid(id) || !["ru", "ro"].includes(locale)) notFound();
  const [product, attributes] = await Promise.all([
    getAdminProduct(id),
    listAdminAttributes(),
  ]);
  if (!product) notFound();
  const translation = product.translations[locale as "ru" | "ro"];
  if (!translation) notFound();
  return (
    <main className="admin-content" id="admin-main">
      <div className="mb-5 flex flex-wrap gap-3">
        <Link
          className="button-secondary"
          href={`/admin/products/${product.id}`}
        >
          ← К редактору
        </Link>
        <span className="status-badge status-badge--warning">
          Защищённый preview {locale.toUpperCase()}
        </span>
      </div>
      <article className="admin-card mx-auto max-w-4xl">
        <p className="text-sm font-bold text-stone-500">
          {product.brand} · {product.model} · {product.sku}
        </p>
        <h1 className="mt-3 text-4xl font-black">{translation.name}</h1>
        <p className="mt-4 text-2xl font-black">
          {minorToMoney(product.priceMinor)} MDL
        </p>
        <p className="mt-5 text-lg">{translation.shortDescription}</p>
        <div className="mt-6 whitespace-pre-wrap text-stone-700">
          {translation.description}
        </div>
        <h2 className="mt-8 text-2xl font-black">Характеристики</h2>
        <dl className="mt-4 divide-y divide-stone-200">
          {product.values.map((value) => {
            const attribute = attributes.find(
              (item) => item.id === value.attributeId,
            );
            const option = attribute?.options.find(
              (item) => item.id === value.optionId,
            );
            const display =
              value.textRu ||
              value.textRo ||
              value.numberValue ||
              (value.booleanValue === null
                ? null
                : value.booleanValue
                  ? "Да"
                  : "Нет") ||
              (locale === "ru" ? option?.labelRu : option?.labelRo) ||
              value.colorValue;
            return display ? (
              <div className="grid gap-1 py-3 sm:grid-cols-2" key={value.id}>
                <dt className="font-bold">
                  {locale === "ru" ? attribute?.nameRu : attribute?.nameRo}
                </dt>
                <dd>{display}</dd>
              </div>
            ) : null;
          })}
        </dl>
      </article>
    </main>
  );
}

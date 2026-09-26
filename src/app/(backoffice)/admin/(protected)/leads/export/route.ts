import { requireAdmin } from "@/features/admin/auth/guard";
import { listAdminLeads } from "@/features/admin/repository";

export const dynamic = "force-dynamic";

function cell(value: string | null) {
  let safe = value ?? "";
  if (/^[=+\-@]/.test(safe)) safe = `'${safe}`;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  await requireAdmin();
  const params = new URL(request.url).searchParams;
  const leads = await listAdminLeads({
    status: params.get("status") ?? undefined,
    source: params.get("source") ?? undefined,
    locale: params.get("locale") ?? undefined,
    productId: params.get("product") ?? undefined,
    dateFrom: params.get("date_from") ?? undefined,
    dateTo: params.get("date_to") ?? undefined,
    query: params.get("q") ?? undefined,
    limit: 5000,
  });
  const rows = [
    [
      "id",
      "created_at",
      "status",
      "name",
      "phone",
      "telegram",
      "locale",
      "source",
      "product",
      "price_minor",
      "comment",
    ],
    ...leads.map((lead) => [
      lead.id,
      lead.createdAt,
      lead.status,
      lead.name,
      lead.phone,
      lead.telegramUsername,
      lead.locale,
      lead.source,
      lead.productName,
      lead.productPriceMinor,
      lead.comment,
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map((value) => cell(value)).join(",")).join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="tehnosklad-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

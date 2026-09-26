import { notFound } from "next/navigation";

import { AttributeGroupForm } from "@/components/admin/admin-forms";
import { AdminNotice, AdminPageHeader } from "@/components/admin/admin-ui";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { deleteAttributeGroupAction } from "@/features/admin/actions";
import { requireAdmin } from "@/features/admin/auth/guard";
import { getAdminAttributeGroup } from "@/features/admin/repository";
import { isUuid } from "@/features/admin/validation";

export const dynamic = "force-dynamic";

export default async function AttributeGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [group, query] = await Promise.all([
    getAdminAttributeGroup(id),
    searchParams,
  ]);
  if (!group) notFound();
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader title={group.nameRu ?? group.code} />
      <AdminNotice {...query} />
      <AttributeGroupForm group={group} />
      <section className="admin-card mt-8">
        <h2 className="text-lg font-black">Удаление</h2>
        <p className="mt-2 text-sm text-stone-600">
          Удалить можно только пустую группу. Используемая группа завершит
          операцию понятной ошибкой.
        </p>
        <form action={deleteAttributeGroupAction} className="mt-4">
          <input name="id" type="hidden" value={group.id} />
          <ConfirmSubmitButton message="Удалить пустую группу без возможности восстановления?">
            Удалить группу
          </ConfirmSubmitButton>
        </form>
      </section>
    </main>
  );
}

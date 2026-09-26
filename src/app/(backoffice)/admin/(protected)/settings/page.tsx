import { AdminNotice, AdminPageHeader } from "@/components/admin/admin-ui";
import { SubmitButton } from "@/components/admin/submit-button";
import { saveSiteSettingAction } from "@/features/admin/actions";
import { requireAdmin } from "@/features/admin/auth/guard";
import { listAdminSiteSettings } from "@/features/admin/repository";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const [settings, query] = await Promise.all([
    listAdminSiteSettings(),
    searchParams,
  ]);
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        description="Только публичный whitelist. Telegram token, service-role key и произвольные ключи недоступны."
        title="Публичные настройки"
      />
      <AdminNotice {...query} />
      <div className="grid gap-4">
        {settings.map((setting) => (
          <form
            action={saveSiteSettingAction}
            className="admin-card grid gap-3 sm:grid-cols-2"
            data-admin-form={`setting-${setting.key}`}
            key={setting.key}
          >
            <input name="key" type="hidden" value={setting.key} />
            <h2 className="font-black sm:col-span-2">
              {setting.label}
              <span className="ml-2 font-mono text-xs text-stone-500">
                {setting.key}
              </span>
            </h2>
            <label className="field-label">
              RU
              <textarea
                className="field min-h-20"
                defaultValue={setting.ru}
                maxLength={1000}
                name="ru"
                required
              />
            </label>
            <label className="field-label">
              RO
              <textarea
                className="field min-h-20"
                defaultValue={setting.ro}
                maxLength={1000}
                name="ro"
                required
              />
            </label>
            <div className="admin-form-actions sm:col-span-2">
              <SubmitButton>Сохранить настройку</SubmitButton>
            </div>
          </form>
        ))}
      </div>
    </main>
  );
}

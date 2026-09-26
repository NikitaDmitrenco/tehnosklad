import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactButton } from "@/components/public/contact-button";
import { CopyPhoneButton } from "@/components/public/copy-phone-button";
import { StoreMap } from "@/components/public/store-map";
import { PageContainer } from "@/components/layout/page-container";
import { getPublicSiteSettings } from "@/features/catalog/data";
import { getDictionary } from "@/i18n/get-dictionary";
import { isLocale } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/features/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const other = locale === "ru" ? "ro" : "ru";
  return buildLocalizedMetadata({
    locale,
    title: d.contacts.title,
    description: d.contacts.description,
    currentPath: `/${locale}/contacts`,
    alternatePath: `/${other}/contacts`,
  });
}

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const settings = await getPublicSiteSettings(locale);
  return (
    <PageContainer className="py-10 sm:py-14">
      <p className="text-sm font-bold uppercase tracking-wide text-stone-500">
        Tehnosklad
      </p>
      <h1 className="mt-2 text-4xl font-bold">{d.contacts.title}</h1>
      <p className="mt-3 text-stone-600">{d.contacts.description}</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 p-6">
          <dl className="space-y-5">
            <div>
              <dt className="text-sm font-bold text-stone-500">
                {d.common.address}
              </dt>
              <dd className="mt-1 font-bold">{settings.address}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-stone-500">
                {d.common.phone}
              </dt>
              <dd className="mt-1">
                <a
                  className="text-xl font-bold hover:underline"
                  href={settings.phoneHref}
                >
                  {settings.phoneDisplay}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-stone-500">
                {d.common.hours}
              </dt>
              <dd className="mt-1">
                {settings.openDays}: {settings.openTime}
                <br />
                {settings.closedDay}
              </dd>
            </div>
          </dl>
          <div className="mt-7 flex flex-wrap gap-2">
            <CopyPhoneButton
              copy={d.actions.copy}
              copied={d.actions.copied}
              phone={settings.phoneDisplay}
            />
            <ContactButton
              dictionary={d}
              locale={locale}
              label={d.actions.contact}
              source="contacts_page"
              settings={settings}
            />
          </div>
        </section>
        <StoreMap dictionary={d} />
      </div>
    </PageContainer>
  );
}

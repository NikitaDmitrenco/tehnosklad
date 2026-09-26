import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { LegalDocument } from "@/components/public/legal-document";
import { getDictionary } from "@/i18n/get-dictionary";
import { isLocale } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/features/seo/metadata";
import { getLegalOperatorConfig } from "@/lib/env/legal";

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
    title: d.footer.privacy,
    description: d.legal.privacyIntro,
    currentPath: `/${locale}/privacy`,
    alternatePath: `/${other}/privacy`,
    index: false,
  });
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const operator = getLegalOperatorConfig();
  return (
    <PageContainer className="max-w-4xl py-10 sm:py-14">
      <LegalDocument
        dictionary={d}
        intro={d.legal.privacyIntro}
        operator={operator}
        sections={d.legal.privacySections}
        title={d.footer.privacy}
      />
    </PageContainer>
  );
}

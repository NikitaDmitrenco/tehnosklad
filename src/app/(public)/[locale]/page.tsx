import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CarouselSection } from "@/components/catalog/carousel-row";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductIllustration } from "@/components/catalog/product-illustration";
import { PageContainer } from "@/components/layout/page-container";
import {
  getPopularProducts,
  getPublishedCategories,
  getPublicSiteSettings,
} from "@/features/catalog/data";
import { getCategoryTone } from "@/features/catalog/presentation";
import { getDictionary } from "@/i18n/get-dictionary";
import { isLocale, localizedPath } from "@/i18n/config";
import { JsonLd } from "@/features/seo/json-ld";
import { buildLocalizedMetadata } from "@/features/seo/metadata";
import { buildHomeSchema } from "@/features/seo/schema";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  return buildLocalizedMetadata({
    locale,
    title:
      locale === "ru"
        ? "Tehnosklad — бытовая техника в Комрате"
        : "Tehnosklad — electrocasnice în Comrat",
    description: d.home.description,
    currentPath: `/${locale}`,
    alternatePath: `/${locale === "ru" ? "ro" : "ru"}`,
    absoluteTitle: true,
  });
}
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const [categories, popular, settings] = await Promise.all([
    getPublishedCategories(locale),
    getPopularProducts(locale, 7),
    getPublicSiteSettings(locale),
  ]);
  return (
    <>
      <JsonLd value={buildHomeSchema(locale, settings)} />
      <section className="relative overflow-hidden border-b border-stone-200 bg-[#FAFAF9] py-10 sm:py-20 lg:py-28">
        <div className="absolute inset-0 pointer-events-none hidden sm:block">
          <img
            src="/hero-banner.svg"
            alt=""
            className="h-full w-full object-cover object-right lg:object-center"
          />
        </div>
        <PageContainer className="relative z-10">
          <div className="max-w-xl lg:max-w-2xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-wide text-stone-600">
              {d.home.eyebrow}
            </p>
            <h1 className="text-3xl font-black tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
              {d.home.title}
            </h1>
            <p className="mt-5 max-w-lg text-base sm:text-lg text-stone-600">
              {d.home.description}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                className="button-primary"
                href={localizedPath(locale, "catalog")}
              >
                {d.actions.openCatalog}
              </Link>
              <a
                className="button-secondary bg-white/90 backdrop-blur-xs"
                href={settings.phoneHref}
              >
                {d.actions.call}
              </a>
            </div>
            <p className="mt-6 text-sm font-semibold text-stone-600">
              {d.home.contactNote}
            </p>
          </div>
        </PageContainer>
      </section>
      <section className="py-14">
        <PageContainer>
          <CarouselSection
            header={
              <div>
                <h2 className="section-title text-xl sm:text-3xl font-bold">
                  {d.home.categoriesTitle}
                </h2>
                <p className="mt-2 text-stone-600">
                  {d.home.categoriesDescription}
                </p>
              </div>
            }
            action={
              <Link
                className="font-bold underline"
                href={localizedPath(locale, "catalog")}
              >
                {d.actions.openCatalog}
              </Link>
            }
          >
            {categories.map((category) => (
              <Link
                className="group flex w-[260px] sm:w-[calc((100%-1rem)/2)] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)] shrink-0 snap-start flex-col rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                key={category.id}
                href={localizedPath(locale, `category/${category.slug}`)}
              >
                <ProductIllustration
                  category={category.presentationKey}
                  tone={getCategoryTone(category.presentationKey)}
                  label={category.name}
                  className="h-36"
                />
                <h3 className="mt-4 text-xl font-bold">{category.name}</h3>
                <p className="mt-1 text-sm text-stone-600 line-clamp-2">
                  {category.shortDescription}
                </p>
              </Link>
            ))}
          </CarouselSection>
        </PageContainer>
      </section>
      {popular.length >= 7 && (
        <section className="bg-stone-50 py-14">
          <PageContainer>
            <CarouselSection
              header={
                <div>
                  <h2 className="section-title text-xl sm:text-3xl font-bold">
                    {d.home.popularTitle}
                  </h2>
                  <p className="mt-2 text-stone-600">
                    {d.home.popularDescription}
                  </p>
                </div>
              }
            >
              {popular.map((product) => (
                <div
                  key={product.id}
                  className="w-[260px] sm:w-[calc((100%-1rem)/2)] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)] shrink-0 snap-start"
                >
                  <ProductCard
                    product={product}
                    locale={locale}
                    dictionary={d}
                    settings={settings}
                    leadSource="home_product_card"
                  />
                </div>
              ))}
            </CarouselSection>
          </PageContainer>
        </section>
      )}
      <section className="py-14">
        <PageContainer>
          <h2 className="section-title text-xl sm:text-3xl font-bold">
            {d.home.benefitsTitle}
          </h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(d.home.benefits).map((benefit) => (
              <article
                className="rounded-2xl border border-stone-200 p-5"
                key={benefit.title}
              >
                <h3 className="font-bold">{benefit.title}</h3>
                <p className="mt-2 text-sm text-stone-600">{benefit.text}</p>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>
      {/* Контакты магазина — закомментировано по дизайну
      <section className="pb-14">
        <PageContainer>
          <div className="grid gap-6 rounded-3xl bg-stone-950 p-6 text-white sm:p-9 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-3xl font-black">{d.home.contactTitle}</h2>
              <p className="mt-2 max-w-xl text-stone-300">
                {d.home.contactDescription}
              </p>
              <p className="mt-5 font-bold">{settings.address}</p>
              <p>
                {settings.openDays}: {settings.openTime}
              </p>
              <p className="text-stone-300">{settings.closedDay}</p>
            </div>
            <div className="flex flex-wrap content-start gap-2">
              <a className="button-primary" href={settings.phoneHref}>
                {d.actions.call}
              </a>
              <CopyPhoneButton
                copy={d.actions.copy}
                copied={d.actions.copied}
                phone={settings.phoneDisplay}
              />
              <Link
                className="button-secondary"
                href={localizedPath(locale, "contacts")}
              >
                {d.navigation.contacts}
              </Link>
              <ContactButton
                dictionary={d}
                locale={locale}
                label={d.actions.contact}
                source="home_contact"
                settings={settings}
              />
            </div>
          </div>
        </PageContainer>
      </section>
      */}
    </>
  );
}

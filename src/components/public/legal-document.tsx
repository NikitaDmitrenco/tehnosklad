import type { LegalOperatorConfig } from "@/lib/env/legal";
import type { Dictionary, LegalSection } from "@/i18n/types";
import { PRIVACY_NOTICE } from "@/config/privacy";
import { siteConfig } from "@/config/site";

function Section({ section }: { section: LegalSection }) {
  return (
    <section>
      <h2 className="text-xl font-black sm:text-2xl">{section.title}</h2>
      <div className="mt-3 space-y-3 text-stone-700">
        {section.paragraphs.map((paragraph) => (
          <p className="break-words" key={paragraph}>
            {paragraph}
          </p>
        ))}
        {section.items?.length ? (
          <ul className="list-disc space-y-2 pl-5 marker:text-stone-500">
            {section.items.map((item) => (
              <li className="break-words pl-1" key={item}>
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export function LegalDocument({
  title,
  intro,
  sections,
  dictionary,
  operator,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
  dictionary: Dictionary;
  operator: LegalOperatorConfig;
}) {
  const legal = dictionary.legal;
  return (
    <article>
      <p className="text-sm font-bold uppercase tracking-wide text-stone-500">
        {legal.versionLabel} {PRIVACY_NOTICE.documentVersion} ·{" "}
        {legal.effectiveDateLabel}{" "}
        <time dateTime={PRIVACY_NOTICE.effectiveDate}>
          {legal.effectiveDate}
        </time>
      </p>
      <h1 className="mt-2 break-words text-3xl font-black sm:text-4xl">
        {title}
      </h1>
      {operator.missing.length ? (
        <aside
          className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-stone-800"
          role="note"
        >
          <strong className="block">{legal.operatorIncompleteTitle}</strong>
          <p className="mt-1">{legal.operatorIncompleteText}</p>
        </aside>
      ) : null}
      <p className="mt-6 text-lg text-stone-700">{intro}</p>

      <section className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-5 sm:p-6">
        <h2 className="text-xl font-black">{legal.operatorTitle}</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-bold text-stone-500">{legal.tradeNameLabel}</dt>
            <dd className="mt-1 font-semibold">{siteConfig.legalName}</dd>
          </div>
          {operator.name ? (
            <div>
              <dt className="font-bold text-stone-500">
                {legal.operatorNameLabel}
              </dt>
              <dd className="mt-1 font-semibold">{operator.name}</dd>
            </div>
          ) : null}
          {operator.idno ? (
            <div>
              <dt className="font-bold text-stone-500">{legal.idnoLabel}</dt>
              <dd className="mt-1 font-semibold">{operator.idno}</dd>
            </div>
          ) : null}
          {operator.legalAddress ? (
            <div>
              <dt className="font-bold text-stone-500">
                {legal.legalAddressLabel}
              </dt>
              <dd className="mt-1 font-semibold">{operator.legalAddress}</dd>
            </div>
          ) : null}
          {operator.privacyEmail ? (
            <div>
              <dt className="font-bold text-stone-500">
                {legal.privacyEmailLabel}
              </dt>
              <dd className="mt-1 font-semibold">
                <a
                  className="underline"
                  href={`mailto:${operator.privacyEmail}`}
                >
                  {operator.privacyEmail}
                </a>
              </dd>
            </div>
          ) : null}
          {operator.responsiblePerson ? (
            <div>
              <dt className="font-bold text-stone-500">
                {legal.responsibleLabel}
              </dt>
              <dd className="mt-1 font-semibold">
                {operator.responsiblePerson}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="font-bold text-stone-500">
              {legal.storeContactLabel}
            </dt>
            <dd className="mt-1 font-semibold">
              {siteConfig.address} ·{" "}
              <a className="underline" href={siteConfig.phoneHref}>
                {siteConfig.phoneDisplay}
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-10 space-y-9">
        {sections.map((section) => (
          <Section key={section.title} section={section} />
        ))}
      </div>

      <section className="mt-10 border-t border-stone-200 pt-7">
        <h2 className="text-xl font-black">{legal.sourcesTitle}</h2>
        <ul className="mt-3 space-y-2 text-sm text-stone-700">
          {legal.sources.map((source) => (
            <li key={source.url}>
              <a
                className="inline-flex min-h-[1.875rem] items-center break-words font-semibold underline underline-offset-4"
                href={source.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-xl bg-stone-100 p-4 text-sm text-stone-700">
          {legal.legalReviewNotice}
        </p>
      </section>
    </article>
  );
}

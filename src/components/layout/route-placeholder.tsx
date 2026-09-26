import { PageContainer } from "@/components/layout/page-container";

export function RoutePlaceholder({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <PageContainer className="py-12 sm:py-16">
      <p className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500">
        {eyebrow}
      </p>
      <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-stone-600">{description}</p>
    </PageContainer>
  );
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function JsonLd({ value }: { value: unknown }) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(value) }}
      type="application/ld+json"
    />
  );
}

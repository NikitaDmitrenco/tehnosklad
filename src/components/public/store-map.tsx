import type { Dictionary } from "@/i18n/types";

const STORE_LOCATION = {
  latitude: 46.3008465,
  longitude: 28.6588914,
} as const;

const marker = `${STORE_LOCATION.latitude}%2C${STORE_LOCATION.longitude}`;
const bbox = "28.6519%2C46.2968%2C28.6659%2C46.3049";
const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
export const storeMapUrl = `https://www.openstreetmap.org/?mlat=${STORE_LOCATION.latitude}&mlon=${STORE_LOCATION.longitude}#map=18/${STORE_LOCATION.latitude}/${STORE_LOCATION.longitude}`;

export function StoreMap({ dictionary }: { dictionary: Dictionary }) {
  return (
    <section
      aria-labelledby="store-map-title"
      className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50"
      data-testid="store-map"
    >
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <h2 className="text-xl font-bold" id="store-map-title">
          {dictionary.contacts.mapTitle}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          {dictionary.contacts.mapDescription}
        </p>
      </div>
      <div className="aspect-[4/3] min-h-72 w-full bg-stone-200 sm:aspect-[16/10]">
        <iframe
          allowFullScreen
          className="h-full w-full border-0 [touch-action:pan-y_pinch-zoom]"
          data-testid="store-map-frame"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          src={embedUrl}
          title={dictionary.contacts.mapAccessibleLabel}
        />
      </div>
      <div className="p-5 pt-4 sm:p-6 sm:pt-4">
        <p className="text-sm text-stone-700">
          {dictionary.contacts.mapMarkerLabel}
        </p>
        <a
          aria-label={dictionary.contacts.mapLinkAccessibleLabel}
          className="mt-2 inline-flex min-h-[1.875rem] items-center font-bold underline decoration-2 underline-offset-4"
          href={storeMapUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {dictionary.contacts.mapLink}
        </a>
      </div>
    </section>
  );
}

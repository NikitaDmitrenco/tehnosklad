"use client";

import { usePathname } from "next/navigation";

export default function PublicDataError({ reset }: { reset: () => void }) {
  const pathname = usePathname();
  const romanian = pathname.startsWith("/ro");
  return (
    <main className="mx-auto grid min-h-[50vh] max-w-3xl place-items-center px-4 py-12 text-center">
      <section>
        <h1 className="text-3xl font-black">
          {romanian
            ? "Catalogul nu este disponibil"
            : "Каталог временно недоступен"}
        </h1>
        <p className="mt-3 text-stone-600">
          {romanian
            ? "Încercați din nou peste câteva momente."
            : "Попробуйте ещё раз через несколько минут."}
        </p>
        <button className="button-primary mt-6" type="button" onClick={reset}>
          {romanian ? "Încearcă din nou" : "Повторить"}
        </button>
      </section>
    </main>
  );
}

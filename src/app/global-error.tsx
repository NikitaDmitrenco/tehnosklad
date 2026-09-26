"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ru">
      <body>
        <main className="mx-auto grid min-h-screen max-w-3xl place-items-center px-4 py-12 text-center">
          <section>
            <h1 className="text-3xl font-black">Сервис временно недоступен</h1>
            <p className="mt-3 text-stone-600">
              Service temporarily unavailable. Please try again later.
            </p>
            <button
              className="button-primary mt-6"
              type="button"
              onClick={reset}
            >
              Повторить
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}

"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="admin-content" id="admin-main">
      <section className="admin-card max-w-xl">
        <h1 className="text-2xl font-black">Не удалось загрузить раздел</h1>
        <p className="mt-3 text-stone-600">
          Повторите запрос. Если ошибка сохраняется, проверьте подключение к
          Supabase.
        </p>
        <button className="button-primary mt-5" onClick={reset} type="button">
          Повторить
        </button>
      </section>
    </main>
  );
}

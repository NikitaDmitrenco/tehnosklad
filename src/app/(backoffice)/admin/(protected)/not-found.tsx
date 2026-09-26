import Link from "next/link";

export default function AdminNotFound() {
  return (
    <main className="admin-content" id="admin-main">
      <section className="admin-card max-w-xl">
        <h1 className="text-2xl font-black">Запись не найдена</h1>
        <p className="mt-3 text-stone-600">
          Возможно, она была архивирована или удалена.
        </p>
        <Link className="button-primary mt-5" href="/admin">
          Вернуться к обзору
        </Link>
      </section>
    </main>
  );
}

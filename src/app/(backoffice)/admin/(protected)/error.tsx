"use client";

import { imageShrinkTip, imageUploadHint } from "@/lib/limits";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="admin-content" id="admin-main">
      <section className="admin-card max-w-xl">
        <h1 className="text-2xl font-black">Не удалось выполнить действие</h1>
        <p className="mt-3 text-stone-600">
          Сервер отклонил запрос — чаще всего это значит, что файл или данные
          слишком большие: {imageUploadHint} (лимит платформы — 4,5 МБ на один
          запрос). {imageShrinkTip}
        </p>
        <p className="mt-2 text-stone-600">
          Если загрузки не было — нажмите «Повторить» или вернитесь на страницу
          и повторите действие.
        </p>
        <button className="button-primary mt-5" onClick={reset} type="button">
          Повторить
        </button>
      </section>
    </main>
  );
}

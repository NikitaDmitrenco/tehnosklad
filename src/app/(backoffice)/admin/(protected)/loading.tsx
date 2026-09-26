export default function AdminLoading() {
  return (
    <main className="admin-content" id="admin-main">
      <div aria-label="Загрузка" className="space-y-4" role="status">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-stone-200" />
        <div className="h-28 animate-pulse rounded-2xl bg-stone-200" />
        <div className="h-28 animate-pulse rounded-2xl bg-stone-200" />
      </div>
    </main>
  );
}

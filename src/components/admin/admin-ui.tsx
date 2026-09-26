import Link from "next/link";

import { adminErrorMessage } from "@/features/admin/errors";

export function AdminPageHeader({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-stone-600">{description}</p>
        ) : null}
      </div>
      {actionHref && actionLabel ? (
        <Link className="button-primary" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </header>
  );
}

export function AdminNotice({
  error,
  saved,
}: {
  error?: string;
  saved?: string;
}) {
  const message = adminErrorMessage(error);
  if (message)
    return (
      <p className="admin-alert admin-alert--error" role="alert">
        {message}
      </p>
    );
  if (saved)
    return (
      <p className="admin-alert admin-alert--success" role="status">
        Изменения сохранены.
      </p>
    );
  return null;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <section className="admin-card text-center">
      <h2 className="text-lg font-black">{title}</h2>
      <p className="mt-2 text-sm text-stone-600">{text}</p>
    </section>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "neutral";
}) {
  return (
    <span className={`status-badge status-badge--${tone}`}>{children}</span>
  );
}

export function AdminCardLink({
  href,
  title,
  meta,
  badges,
}: {
  href: string;
  title: string;
  meta?: string;
  badges?: React.ReactNode;
}) {
  return (
    <Link className="admin-list-card" href={href}>
      <div className="min-w-0">
        <h2 className="truncate font-black">{title}</h2>
        {meta ? <p className="mt-1 text-sm text-stone-600">{meta}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {badges}
        <span aria-hidden="true">→</span>
      </div>
    </Link>
  );
}

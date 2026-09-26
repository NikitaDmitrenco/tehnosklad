"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "button-primary",
  pendingText = "Сохранение…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? pendingText : children}
    </button>
  );
}

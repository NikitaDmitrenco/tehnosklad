"use client";

import { useFormStatus } from "react-dom";

export function ConfirmSubmitButton({
  children,
  message,
  className = "button-danger",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      type="submit"
    >
      {pending ? "Выполнение…" : children}
    </button>
  );
}

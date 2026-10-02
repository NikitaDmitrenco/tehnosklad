"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

import { SubmitButton } from "@/components/admin/submit-button";
import { adminErrorText } from "@/features/admin/errors";
import { checkImageFile } from "@/features/admin/image-check";
import { imageLimits, imageShrinkTip, imageUploadHint } from "@/lib/limits";

// Client-side gate for image uploads: the file is checked on selection and
// the submit is blocked while a problem is shown, so a heavy or wrong file
// never leaves the browser. The server re-runs the same checks as the last
// line of defence (see validateProductImage).
export function ImageUploadForm({
  action,
  children,
  className,
  dataAdminForm,
  head,
  submitLabel,
  pendingText = "Загрузка…",
}: {
  action: (formData: FormData) => Promise<never>;
  /** Extra fields rendered after the file input (alt texts, sort order…). */
  children?: ReactNode;
  className?: string;
  dataAdminForm?: string;
  /** Hidden inputs (entity id) rendered before the file input. */
  head?: ReactNode;
  submitLabel: string;
  pendingText?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setError(null);
      return;
    }
    const problem = checkImageFile(file);
    setError(problem ? adminErrorText(problem.code, problem.params) : null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const file = inputRef.current?.files?.[0];
    const problem = file ? checkImageFile(file) : null;
    if (problem) {
      event.preventDefault();
      setError(adminErrorText(problem.code, problem.params));
    }
  };

  return (
    <form
      action={action}
      className={className}
      data-admin-form={dataAdminForm}
      onSubmit={handleSubmit}
    >
      {head}
      <label className="field-label">
        Файл
        <input
          ref={inputRef}
          accept={imageLimits.mimeTypes.join(",")}
          className="field"
          name="image"
          onChange={handleChange}
          required
          type="file"
        />
        <span className="admin-help">
          {imageUploadHint}. {imageShrinkTip}
        </span>
        {error ? (
          <span
            className="mt-1 block text-sm font-bold text-red-700"
            role="alert"
          >
            {error}
          </span>
        ) : null}
      </label>
      {children}
      <div className="admin-form-actions">
        <SubmitButton disabled={error !== null} pendingText={pendingText}>
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}

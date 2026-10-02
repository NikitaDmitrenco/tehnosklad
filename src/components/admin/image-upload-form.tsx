"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

import { SubmitButton } from "@/components/admin/submit-button";
import { adminErrorText } from "@/features/admin/errors";
import { checkImageFile } from "@/features/admin/image-check";
import { compressImage } from "@/lib/image-compress";
import { formatMegabytes, imageCompressHint, imageLimits } from "@/lib/limits";

// Client-side gate for image uploads: on selection the photo is shrunk in
// the browser (src/lib/image-compress.ts) and the resized file replaces the
// original in the input, so a heavy photo never leaves the browser. The file
// is re-checked before submit and the server re-runs the same checks as the
// last line of defence (see validateProductImage).
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
  const [notice, setNotice] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Only the latest selection may apply its result: picking a second file
  // while the first is still processing discards the first outcome.
  const selectionRef = useRef(0);

  const processSelection = useCallback(async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    if (!file) {
      setError(null);
      setNotice(null);
      return;
    }
    const selection = ++selectionRef.current;
    // Synchronous busy marker: set during the change dispatch (before the
    // first await), so e2e tests can wait for it to clear instead of racing
    // the async handler. Only the selection that owns the marker may clear it.
    input.dataset.compressing = "1";
    setCompressing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await compressImage(file);
      if (selection !== selectionRef.current) return;

      if (result.file !== file) {
        const transfer = new DataTransfer();
        transfer.items.add(result.file);
        input.files = transfer.files;
      }
      if (result.error) {
        // Compression failed: surface the pre-existing size/type error when
        // the original file itself is the problem, otherwise the reason the
        // browser gave (it never crashed the form).
        const originalProblem = checkImageFile(file);
        setError(
          originalProblem
            ? adminErrorText(originalProblem.code, originalProblem.params)
            : result.error,
        );
      } else {
        const problem = checkImageFile(result.file);
        setError(problem ? adminErrorText(problem.code, problem.params) : null);
      }
      setNotice(
        result.wasCompressed
          ? `Фото уменьшено: ${formatMegabytes(result.before)} → ${formatMegabytes(result.after)} (${result.width}×${result.height})`
          : null,
      );
    } finally {
      if (selection === selectionRef.current) {
        delete input.dataset.compressing;
        setCompressing(false);
      }
    }
  }, []);

  // data-ready marks that this component is live (React listeners attached);
  // e2e tests wait for it before selecting a file. If a file somehow got
  // selected even earlier, onChange never fired — process it now instead of
  // silently leaving an unprocessed photo in the input.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.dataset.ready = "1";
    if (input.files && input.files.length > 0) void processSelection(input);
  }, [processSelection]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    void processSelection(event.target);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (compressing) {
      event.preventDefault();
      return;
    }
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
        <span className="admin-help">{imageCompressHint}</span>
        {compressing ? (
          <span aria-live="polite" className="admin-help" role="status">
            Уменьшаю фото…
          </span>
        ) : null}
        {notice ? (
          <span
            aria-live="polite"
            className="mt-1 block text-sm font-bold text-emerald-800"
            role="status"
          >
            {notice}
          </span>
        ) : null}
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
        <SubmitButton
          disabled={error !== null || compressing}
          pendingText={pendingText}
        >
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}

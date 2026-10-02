// Shared size/type pre-check for image uploads — imported by BOTH the
// client-side form (blocks the submit before any bytes leave the browser)
// and the server-side validator (last line of defence when the client is
// bypassed), so the user always sees the same wording. Client-safe: no
// node built-ins, no server-only imports.

import { imageLimits, formatMegabytes } from "@/lib/limits";

export type ImageCheckProblem = {
  code: string;
  params: { actual?: string; limit?: string; allowed?: string };
};

const minImageBytes = 12;

function fileExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index + 1).toLowerCase() : "";
}

const extensionMimeTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

// Browsers derive File.type from the extension; server-side crafted files
// may carry no MIME at all, so the extension is the fallback.
export function resolveMimeType(fileName: string, type: string): string {
  if (type) return type;
  return extensionMimeTypes[fileExtension(fileName)] ?? "";
}

export function fileTypeLabel(fileName: string, type: string): string {
  const extension = fileExtension(fileName);
  if (extension && !imageLimits.extensions.includes(extension))
    return extension.toUpperCase();
  if (type) return type.replace(/^image\//, "").toUpperCase();
  return extension ? extension.toUpperCase() : "неизвестный формат";
}

export function checkImageFileSize(file: {
  size: number;
}): ImageCheckProblem | null {
  if (file.size < minImageBytes)
    return { code: "upload_corrupted", params: {} };
  if (file.size > imageLimits.maxBytes)
    return {
      code: "upload_too_large",
      params: {
        actual: formatMegabytes(file.size),
        limit: imageLimits.maxLabel,
      },
    };
  return null;
}

export function checkImageFileType(file: {
  name: string;
  type: string;
}): ImageCheckProblem | null {
  const mimeType = resolveMimeType(file.name, file.type);
  if (!mimeType || !imageLimits.mimeTypes.includes(mimeType))
    return {
      code: "upload_type_not_allowed",
      params: {
        actual: fileTypeLabel(file.name, file.type),
        allowed: imageLimits.allowedLabel,
      },
    };
  return null;
}

export function checkImageFile(file: File): ImageCheckProblem | null {
  return checkImageFileSize(file) ?? checkImageFileType(file);
}

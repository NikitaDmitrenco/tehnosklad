/**
 * Generates an isolated, collision-resistant RUN_ID for an E2E test run or worker.
 * Format: E2E-YYYYMMDD-HHMMSS-RAND
 * Example: E2E-20260819-180530-a81f
 */
export function generateRunId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6);

  return `E2E-${year}${month}${day}-${hours}${minutes}${seconds}-${rand}`;
}

export function formatRunSlug(
  prefix: string,
  runId: string,
  lang = "ru",
): string {
  const cleanPrefix = prefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const cleanRunId = runId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${cleanPrefix}-${cleanRunId}-${lang}`.replace(/-+/g, "-");
}

export function formatRunSku(runId: string, index = 1): string {
  const suffix = runId.split("-").pop() || "0001";
  return `TS-E2E-${suffix.toUpperCase()}-${String(index).padStart(2, "0")}`;
}

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { localizedPath } from "@/i18n/config";
import { LOCALE_COOKIE, resolveEntryLocale } from "@/i18n/locale-cookie";

export default async function EntryPage() {
  const [cookieStore, requestHeaders] = await Promise.all([
    cookies(),
    headers(),
  ]);
  const locale = resolveEntryLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    requestHeaders.get("accept-language"),
  );
  redirect(localizedPath(locale));
}

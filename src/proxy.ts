import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isLocale } from "@/i18n/config";
import { LOCALE_COOKIE, localeCookieOptions } from "@/i18n/locale-cookie";
import { updateAdminSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return updateAdminSession(request);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tehnosklad-pathname", pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // The URL is the single source of truth for the locale: a saved preference
  // never redirects a locale-prefixed request. Visiting a localized page is
  // what records the preference, so switching language works without client
  // JavaScript and prefetches can never race the cookie write. The cookie is
  // read back only on the locale-less entry route.
  const urlLocale = pathname.split("/")[1];
  if (
    urlLocale &&
    isLocale(urlLocale) &&
    request.cookies.get(LOCALE_COOKIE)?.value !== urlLocale
  ) {
    response.cookies.set(LOCALE_COOKIE, urlLocale, localeCookieOptions());
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};

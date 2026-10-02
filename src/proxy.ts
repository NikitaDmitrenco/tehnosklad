import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isLocale } from "@/i18n/config";
import { LOCALE_COOKIE, localeCookieOptions } from "@/i18n/locale-cookie";
import { updateAdminSession } from "@/lib/supabase/proxy";
import {
  imageShrinkTip,
  imageUploadHint,
  requestBodyMaxBytes,
} from "@/lib/limits";

// Bodies above the platform cap die before any application code (and before
// the Next.js bodySizeLimit), which used to surface as a bare
// "Internal Server Error" for form posts. Answer here instead: a short,
// human explanation with the limit and what to do.
function requestTooLargePage(): NextResponse {
  const html = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>Слишком большой запрос</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.5; color: #1c1917;">
<h1>Слишком большой запрос</h1>
<p>Файл или данные превышают допустимый лимит — ${imageUploadHint}. Лимит платформы на один запрос: 4,5&nbsp;МБ.</p>
<p>${imageShrinkTip}</p>
<p>Вернитесь на страницу и повторите действие с файлом меньшего размера.</p>
</body>
</html>`;
  return new NextResponse(html, {
    status: 413,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    request.method === "POST" ||
    request.method === "PUT" ||
    request.method === "PATCH"
  ) {
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > requestBodyMaxBytes)
      return requestTooLargePage();
  }

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

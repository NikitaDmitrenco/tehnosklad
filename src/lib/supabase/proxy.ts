import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { safeAdminRedirectTarget } from "@/features/admin/auth/redirect";
import { getOptionalSupabasePublicEnvironment } from "@/lib/env/public";
import { EnvironmentConfigurationError } from "@/lib/env/shared";

function copyPrivateResponseState(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  for (const name of ["cache-control", "expires", "pragma"] as const) {
    const value = from.headers.get(name);
    if (value) to.headers.set(name, value);
  }
  to.headers.set("Cache-Control", "private, no-store");
}

export async function updateAdminSession(request: NextRequest) {
  let environment: ReturnType<typeof getOptionalSupabasePublicEnvironment>;
  try {
    environment = getOptionalSupabasePublicEnvironment();
  } catch (error) {
    if (!(error instanceof EnvironmentConfigurationError)) throw error;
    environment = null;
  }
  if (!environment) {
    if (request.nextUrl.pathname === "/admin/login") {
      return NextResponse.next({ request });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = new URLSearchParams({ error: "config" }).toString();
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();
  const isLogin = request.nextUrl.pathname === "/admin/login";
  if ((error || !data?.claims) && !isLogin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = new URLSearchParams({
      next: safeAdminRedirectTarget(
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      ),
    }).toString();
    const redirectResponse = NextResponse.redirect(loginUrl);
    copyPrivateResponseState(response, redirectResponse);
    return redirectResponse;
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

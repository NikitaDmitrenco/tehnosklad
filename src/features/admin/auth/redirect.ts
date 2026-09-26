export function safeAdminRedirectTarget(
  candidate: string | null | undefined,
): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/admin";
  }
  try {
    const url = new URL(candidate, "https://tehnosklad.invalid");
    if (url.origin !== "https://tehnosklad.invalid") return "/admin";
    if (url.pathname !== "/admin" && !url.pathname.startsWith("/admin/")) {
      return "/admin";
    }
    if (
      url.pathname === "/admin/login" ||
      url.pathname.startsWith("/admin/login/")
    ) {
      return "/admin";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/admin";
  }
}

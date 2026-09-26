export function hasActiveAdminRole(
  profile: { is_active: boolean } | null,
  role: { role: string } | null,
): boolean {
  return profile?.is_active === true && role?.role === "admin";
}

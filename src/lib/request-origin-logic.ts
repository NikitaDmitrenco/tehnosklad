export type MutationOriginEnvironment = {
  siteUrl: string;
  vercelEnvironment?: string;
  vercelUrl?: string;
};

function originOf(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isAllowedMutationOrigin(
  origin: string | null,
  environment: MutationOriginEnvironment,
): boolean {
  if (!origin) return false;
  if (origin === environment.siteUrl) return true;
  if (
    !["preview", "production"].includes(environment.vercelEnvironment ?? "") ||
    !environment.vercelUrl?.trim()
  ) {
    return false;
  }
  return origin === originOf(`https://${environment.vercelUrl.trim()}`);
}

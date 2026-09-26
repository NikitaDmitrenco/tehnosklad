export class EnvironmentConfigurationError extends Error {
  constructor(names: readonly string[]) {
    super(`Missing required environment variables: ${names.join(", ")}`);
    this.name = "EnvironmentConfigurationError";
  }
}

export function requireValidUrl(name: string, value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:")
      throw new Error();
    const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(
      url.hostname,
    );
    if (
      process.env.NODE_ENV === "production" &&
      url.protocol !== "https:" &&
      !isLoopback
    )
      throw new Error();
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new EnvironmentConfigurationError([name]);
  }
}

export function requireEnvironmentVariables<
  const T extends Record<string, string | undefined>,
>(values: T): { [Key in keyof T]: string } {
  const missing = Object.entries(values)
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new EnvironmentConfigurationError(missing);
  }

  return values as { [Key in keyof T]: string };
}

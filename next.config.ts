import type { NextConfig } from "next";

const scriptSource =
  process.env.NODE_ENV === "development"
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src https://www.openstreetmap.org; object-src 'none'; img-src 'self' data: blob: https:; script-src ${scriptSource}; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co`,
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    useTypeScriptCli: false,
    // Just above the app image limit (4 MiB + multipart overhead) and in
    // line with the Vercel request-body cap (4.5 MB, vercel.com/docs/
    // functions/limitations §Request body size, checked 2026-10-01): the
    // browser-side check always fires first, this is the server-side net.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;

import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/env/public";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/ru/privacy",
        "/ro/privacy",
        "/ru/personal-data",
        "/ro/personal-data",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}

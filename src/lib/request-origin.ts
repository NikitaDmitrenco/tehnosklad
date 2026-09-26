import "server-only";

import { getSiteUrl } from "@/lib/env/public";
import {
  isAllowedMutationOrigin as isAllowedMutationOriginForEnvironment,
  type MutationOriginEnvironment,
} from "@/lib/request-origin-logic";

export function isAllowedMutationOrigin(
  origin: string | null,
  environment: MutationOriginEnvironment = {
    siteUrl: getSiteUrl(),
    vercelEnvironment: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
  },
): boolean {
  return isAllowedMutationOriginForEnvironment(origin, environment);
}

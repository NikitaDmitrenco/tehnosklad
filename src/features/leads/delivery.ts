import "server-only";

import type { LeadStore } from "@/features/leads/repository";
import {
  formatLeadTelegramMessage,
  sendLeadToTelegram,
} from "@/features/leads/telegram";
import type { TelegramEnvironment } from "@/lib/env/server";

export async function processTelegramDelivery(
  store: LeadStore,
  telegram: TelegramEnvironment | null,
  leadId?: string,
) {
  const claim = await store.claimTelegramDelivery(leadId);
  if (!claim) return false;
  const lead = await store.getForTelegram(claim.leadId);
  const result = lead
    ? await sendLeadToTelegram(telegram, formatLeadTelegramMessage(lead))
    : {
        outcome: "permanent_failure" as const,
        errorCode: "lead_not_found",
        providerHttpStatus: null,
        providerErrorCode: null,
        providerMessageId: null,
        retryAfterSeconds: null,
      };
  await store.completeTelegramDelivery({
    attemptId: claim.attemptId,
    leaseToken: claim.leaseToken,
    ...result,
  });
  return true;
}

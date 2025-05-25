import { Plan, UserAccess, UserUsage } from "@prisma/client";
import { SubscriptionInfoResponseDto, SubscriptionPlan } from "../dto/response/subscription-info.dto";

export const subscriptionInfoResponseMapper = (
  access: UserAccess,
  plan: Plan,
  userUsage: UserUsage
): SubscriptionInfoResponseDto => {
  return {
    plan: SubscriptionPlan[plan.id],
    aiCreditUsedAmount: userUsage.usedAmount,
    dailyAiCreditLimit: plan.dailyQuotaCredits,
    createdAt: access.createdAt,
    expiresAt: access.expiresAt,
  };
}
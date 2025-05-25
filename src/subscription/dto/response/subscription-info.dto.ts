export class SubscriptionInfoResponseDto {
  plan: SubscriptionPlan;
  aiCreditUsedAmount: number;
  dailyAiCreditLimit: number;
  createdAt: Date;
  expiresAt: Date;
}

export enum SubscriptionPlan {
  FREE = 'free',
  ARTIST_PRO = 'artist_pro',
  STUDIO = 'studio',
  ENTERPRISE = 'enterprise',
}

  
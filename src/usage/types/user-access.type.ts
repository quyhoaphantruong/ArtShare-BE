import { Prisma } from "@prisma/client";

export type UserAccessWithPlan = Prisma.UserAccessGetPayload<{
  include: { plan: true };
}>;
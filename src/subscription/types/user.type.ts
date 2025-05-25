import { Prisma } from "@prisma/client";

export type UserWithUsageAndAccess = Prisma.UserGetPayload<{
  include: {
    userAccess: true;
    UserUsage: true;
  }
}>;
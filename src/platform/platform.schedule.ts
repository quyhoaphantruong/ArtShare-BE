import { PlatformStatus } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma.service';
import { Logger } from '@nestjs/common';

export class PlatformScheduler {
  private readonly logger = new Logger(PlatformScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *')
  async handleExpiredTokens() {
    this.logger.log(
      'Running scheduled job to mark expired platforms as INACTIVE...',
    );

    const now = new Date();

    const result = await this.prisma.platform.updateMany({
      where: {
        status: PlatformStatus.ACTIVE,
        token_expires_at: {
          not: null,
          lt: now,
        },
      },

      data: {
        status: PlatformStatus.INACTIVE,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Proactively marked ${result.count} platform(s) as INACTIVE due to token expiration.`,
      );
    }
  }
}

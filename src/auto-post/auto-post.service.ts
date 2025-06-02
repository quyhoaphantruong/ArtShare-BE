import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AutoPostStatus, ScheduledPost } from '@prisma/client';
import { SchedulePostDto, UpdatePostStatusDto } from './dto/schedule-post.dto';
import { firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma.service';
import { AxiosError } from 'axios';
import { EncryptionService } from 'src/encryption/encryption.service';

@Injectable()
export class AutoPostService {
  private readonly logger = new Logger(AutoPostService.name);
  private readonly n8nExecutePostWebhookUrl?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.n8nExecutePostWebhookUrl = this.configService.get<string>(
      'N8N_EXECUTE_FACEBOOK_POST_WEBHOOK_URL',
    );
    if (!this.n8nExecutePostWebhookUrl) {
      this.logger.warn('N8N_EXECUTE_FACEBOOK_POST_WEBHOOK_URL not configured!');
    }
  }

  async createSchedule(
    dto: SchedulePostDto,
  ): Promise<
    Omit<ScheduledPost, 'encryptedFacebookAccessToken' | 'facebookAccessToken'>
  > {
    this.logger.log(
      `Creating schedule for page ${dto.facebookPageId} at ${dto.scheduleAt}`,
    );
    try {
      const encryptedToken = this.encryptionService.encrypt(
        dto.facebookAccessToken,
      );

      const post = await this.prisma.scheduledPost.create({
        data: {
          content: dto.content,
          scheduleAt: new Date(dto.scheduleAt),
          facebookPageId: dto.facebookPageId,
          encryptedFacebookAccessToken: encryptedToken,
          imageUrls: dto.imageUrls || [],
          status: AutoPostStatus.PENDING,
        },
      });

      post.encryptedFacebookAccessToken = '';

      return post;
    } catch (error) {
      this.logger.error(
        `Failed to create schedule: ${error instanceof Error ? error.message : String(error)}`,
      );
      if ((error as Error).message.includes('Encryption process failed')) {
        throw new InternalServerErrorException(
          'Could not process token for scheduling.',
        );
      }
      throw new InternalServerErrorException('Could not create the schedule.');
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPostsTrigger() {
    const duePosts = await this.prisma.scheduledPost.findMany({
      where: {
        status: AutoPostStatus.PENDING,
        scheduleAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        scheduleAt: 'asc',
      },
      take: 10,
    });

    for (const post of duePosts) {
      let decryptedAccessToken: string;
      try {
        decryptedAccessToken = this.encryptionService.decrypt(
          post.encryptedFacebookAccessToken,
        );
      } catch (decryptionError) {
        this.logger.error(
          `Decryption failed for post ID ${post.id}. Marking as ERROR.`,
          (decryptionError as Error).message,
        );
        await this.prisma.scheduledPost.update({
          where: { id: post.id },
          data: {
            status: AutoPostStatus.ERROR,
            errorMessage:
              'Token decryption failed. Please re-authenticate/re-save the schedule.',
          },
        });
        continue;
      }

      try {
        const payloadToN8n = {
          scheduleId: post.id,
          content: post.content,
          facebookPageId: post.facebookPageId,
          facebookAccessToken: decryptedAccessToken,
          imageUrls: post.imageUrls,
        };

        await this.prisma.scheduledPost.update({
          where: { id: post.id },
          data: {
            status: AutoPostStatus.PROCESSING,
            n8nTriggeredAt: new Date(),
          },
        });

        await firstValueFrom(
          this.httpService.post(this.n8nExecutePostWebhookUrl!, payloadToN8n),
        );

        this.logger.log(`Successfully triggered n8n for post ID: ${post.id}`);
      } catch (error) {
        const err = error as AxiosError;
        this.logger.error(
          `Failed to trigger n8n for post ID: ${post.id}`,
          err.response?.data || err.message,
        );

        await this.prisma.scheduledPost.update({
          where: { id: post.id },
          data: {
            status: AutoPostStatus.ERROR,
            errorMessage: `Failed to trigger n8n: ${err.message}`,
            n8nTriggeredAt: null,
          },
        });
      }
    }
  }

  async updatePostStatus(dto: UpdatePostStatusDto): Promise<ScheduledPost> {
    this.logger.log(
      `Updating status for post ID ${dto.scheduleId} to ${dto.status}`,
    );
    const existingPost = await this.prisma.scheduledPost.findUnique({
      where: { id: dto.scheduleId },
    });

    if (!existingPost) {
      throw new NotFoundException(
        `Scheduled post with ID ${dto.scheduleId} not found.`,
      );
    }

    const updatedPost = await this.prisma.scheduledPost.update({
      where: { id: dto.scheduleId },
      data: {
        status: dto.status,
        errorMessage: dto.errorMessage,
        postedAt:
          dto.status === AutoPostStatus.POSTED
            ? new Date()
            : existingPost.postedAt,
        n8nExecutionId: dto.n8nExecutionId,
      },
    });

    updatedPost.encryptedFacebookAccessToken = '';

    return updatedPost;
  }

  async cancelSchedule(scheduleId: string): Promise<ScheduledPost> {
    const post = await this.prisma.scheduledPost.findUnique({
      where: { id: scheduleId },
    });
    if (!post) {
      throw new NotFoundException(
        `Scheduled post with ID ${scheduleId} not found.`,
      );
    }
    if (post.status === AutoPostStatus.POSTED) {
      throw new InternalServerErrorException(
        'Cannot cancel a post that has already been posted.',
      );
    }
    const result = await this.prisma.scheduledPost.update({
      where: { id: scheduleId },
      data: { status: AutoPostStatus.CANCELLED },
    });

    result.encryptedFacebookAccessToken = '';

    return result;
  }
}

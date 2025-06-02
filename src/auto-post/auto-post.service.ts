import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AutoPostStatus, Prisma, ScheduledPost } from '@prisma/client';
import {
  GetScheduledPostsQueryDto,
  SchedulePostDto,
  UpdatePostStatusDto,
  UpdateScheduledPostDto,
} from './dto/schedule-post.dto';
import { firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma.service';
import { AxiosError } from 'axios';
import { EncryptionService } from 'src/encryption/encryption.service';

export type PublicScheduledPost = Omit<
  ScheduledPost,
  'encryptedFacebookAccessToken'
>;

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

  private toPublicScheduledPost(post: ScheduledPost): PublicScheduledPost {
    const { encryptedFacebookAccessToken: _, ...publicData } = post;
    return publicData;
  }

  private toPublicScheduledPostNullable(
    post: ScheduledPost | null,
  ): PublicScheduledPost | null {
    if (!post) return null;
    return this.toPublicScheduledPost(post);
  }

  private async findPostOrThrow(id: number): Promise<ScheduledPost> {
    const post = await this.prisma.scheduledPost.findUnique({
      where: { id },
    });
    if (!post) {
      throw new NotFoundException(`Scheduled post with ID ${id} not found.`);
    }
    return post;
  }

  async createSchedule(dto: SchedulePostDto): Promise<PublicScheduledPost> {
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

      return this.toPublicScheduledPost(post);
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

  async getScheduledPostById(id: number): Promise<PublicScheduledPost | null> {
    this.logger.log(`Fetching scheduled post with ID: ${id}`);
    const post = await this.prisma.scheduledPost.findUnique({
      where: { id },
    });

    return this.toPublicScheduledPostNullable(post);
  }

  async getAllScheduledPosts(
    query: GetScheduledPostsQueryDto,
  ): Promise<{ data: PublicScheduledPost[]; count: number }> {
    this.logger.log('Fetching all scheduled posts with query:', query);
    const {
      page = 1,
      limit = 10,
      status,
      facebookPageId,
      sortBy = 'scheduleAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ScheduledPostWhereInput = {};
    if (status) {
      where.status = status;
    }
    if (facebookPageId) {
      where.facebookPageId = facebookPageId;
    }

    const skip = (page - 1) * limit;

    const [posts, count] = await this.prisma.$transaction([
      this.prisma.scheduledPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.scheduledPost.count({ where }),
    ]);

    return {
      data: posts.map((post) => this.toPublicScheduledPost(post)),
      count,
    };
  }

  async updateScheduledPost(
    id: number,
    dto: UpdateScheduledPostDto,
  ): Promise<PublicScheduledPost> {
    this.logger.log(`Updating scheduled post with ID: ${id}`);
    const existingPost = await this.findPostOrThrow(id);

    if (
      existingPost.status !== AutoPostStatus.PENDING &&
      existingPost.status !== AutoPostStatus.ERROR
    ) {
      throw new BadRequestException(
        `Cannot update post in status: ${existingPost.status}. Only PENDING or ERROR posts can be updated.`,
      );
    }

    const dataToUpdate: Prisma.ScheduledPostUpdateInput = {};
    if (dto.content !== undefined) dataToUpdate.content = dto.content;
    if (dto.scheduleAt !== undefined)
      dataToUpdate.scheduleAt = new Date(dto.scheduleAt);
    if (dto.facebookPageId !== undefined)
      dataToUpdate.facebookPageId = dto.facebookPageId;
    if (dto.imageUrls !== undefined) dataToUpdate.imageUrls = dto.imageUrls;

    if (dto.facebookAccessToken) {
      try {
        dataToUpdate.encryptedFacebookAccessToken =
          this.encryptionService.encrypt(dto.facebookAccessToken);
      } catch (error) {
        this.logger.error(
          `Token encryption failed during update for post ID ${id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw new InternalServerErrorException(
          'Could not process token for update.',
        );
      }
    }

    const hasSubstantiveChanges =
      dto.content || dto.scheduleAt || dto.facebookAccessToken || dto.imageUrls;
    if (existingPost.status === AutoPostStatus.ERROR && hasSubstantiveChanges) {
      dataToUpdate.status = AutoPostStatus.PENDING;
      dataToUpdate.errorMessage = null;
      dataToUpdate.n8nTriggeredAt = null;
      dataToUpdate.postedAt = null;
      dataToUpdate.n8nExecutionId = null;
    }

    const updatedPost = await this.prisma.scheduledPost.update({
      where: { id },
      data: dataToUpdate,
    });

    return this.toPublicScheduledPost(updatedPost);
  }

  async deleteScheduledPost(id: number): Promise<void> {
    this.logger.log(`Deleting scheduled post with ID: ${id}`);
    const post = await this.findPostOrThrow(id);

    if (
      post.status === AutoPostStatus.PROCESSING ||
      post.status === AutoPostStatus.POSTED
    ) {
      throw new BadRequestException(
        `Cannot delete a post that is ${post.status}. Consider cancelling it instead.`,
      );
    }

    await this.prisma.scheduledPost.delete({
      where: { id },
    });
    this.logger.log(`Successfully deleted post ID: ${id}`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPostsTrigger() {
    if (!this.n8nExecutePostWebhookUrl) {
      this.logger.warn('N8N webhook URL not set, skipping post trigger.');
      return;
    }

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

    if (duePosts.length === 0) {
      return;
    }
    this.logger.log(`Found ${duePosts.length} due posts to trigger.`);

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

        this.logger.log(
          `Triggering n8n for post ID: ${post.id} with payload:`,
          payloadToN8n.content.substring(0, 50) + '...',
        );

        await firstValueFrom(
          this.httpService.post(this.n8nExecutePostWebhookUrl, payloadToN8n),
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
            errorMessage: `Failed to trigger n8n: ${err.message?.substring(0, 250) || 'Unknown n8n trigger error'}`,
            n8nTriggeredAt: null,
          },
        });
      }
    }
  }

  async updatePostStatus(
    dto: UpdatePostStatusDto,
  ): Promise<PublicScheduledPost> {
    this.logger.log(
      `Updating status for post ID ${dto.scheduleId} to ${dto.status}`,
    );

    const dataToUpdate: Prisma.ScheduledPostUpdateInput = {
      status: dto.status,
      errorMessage: dto.errorMessage,
      n8nExecutionId: dto.n8nExecutionId,
    };

    if (dto.status === AutoPostStatus.POSTED) {
      dataToUpdate.postedAt = new Date();
      dataToUpdate.errorMessage = null;
    } else if (dto.status !== AutoPostStatus.ERROR) {
      dataToUpdate.errorMessage = null;
    }

    const updatedPost = await this.prisma.scheduledPost.update({
      where: { id: dto.scheduleId },
      data: dataToUpdate,
    });

    return this.toPublicScheduledPost(updatedPost);
  }

  async cancelSchedule(scheduleId: number): Promise<PublicScheduledPost> {
    this.logger.log(`Cancelling schedule for post ID: ${scheduleId}`);
    const post = await this.findPostOrThrow(scheduleId);

    if (post.status === AutoPostStatus.POSTED) {
      throw new BadRequestException(
        'Cannot cancel a post that has already been posted.',
      );
    }
    if (post.status === AutoPostStatus.CANCELLED) {
      this.logger.warn(`Post ID ${scheduleId} is already cancelled.`);
      return this.toPublicScheduledPost(post);
    }

    const result = await this.prisma.scheduledPost.update({
      where: { id: scheduleId },
      data: {
        status: AutoPostStatus.CANCELLED,
        errorMessage: null,
      },
    });

    return this.toPublicScheduledPost(result);
  }
}

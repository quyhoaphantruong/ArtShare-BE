import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AutoPostStatus,
  Prisma,
  AutoPost as PrismaAutoPost,
} from '@prisma/client';

import { firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma.service';
import { AxiosError } from 'axios';
import { EncryptionService } from 'src/encryption/encryption.service';
import {
  ScheduleAutoPostDto,
  GetAutoPostsQueryDto,
  UpdateAutoPostDto,
  UpdateAutoPostStatusDto,
} from './dto/auto-post.dto.ts';

export interface PlatformConfig {
  encryptedFacebookAccessToken?: string;
  facebookPageId?: string;
}

export type PublicAutoPost = PrismaAutoPost;

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

  private toPublicAutoPost(post: PrismaAutoPost): PublicAutoPost {
    return post;
  }

  private toPublicAutoPostNullable(
    post: PrismaAutoPost | null,
  ): PublicAutoPost | null {
    if (!post) return null;
    return this.toPublicAutoPost(post);
  }

  private async findAutoPostOrThrow(id: number): Promise<PrismaAutoPost> {
    const post = await this.prisma.autoPost.findUnique({
      where: { id },
    });
    if (!post) {
      throw new NotFoundException(`AutoPost with ID ${id} not found.`);
    }
    return post;
  }

  async createAutoPost(dto: ScheduleAutoPostDto): Promise<PublicAutoPost> {
    this.logger.log(
      `Creating AutoPost for AutoProject ID ${dto.autoProjectId} at ${dto.scheduledAt}`,
    );
    try {
      const autoProject = await this.prisma.autoProject.findUnique({
        where: { id: dto.autoProjectId },
      });
      if (!autoProject) {
        throw new NotFoundException(
          `AutoProject with ID ${dto.autoProjectId} not found.`,
        );
      }

      const post = await this.prisma.autoPost.create({
        data: {
          auto_project_id: dto.autoProjectId,
          content: dto.content,
          scheduled_at: new Date(dto.scheduledAt),
          image_urls: dto.imageUrls || [],
          status: AutoPostStatus.PENDING,
        },
      });

      return this.toPublicAutoPost(post);
    } catch (error) {
      this.logger.error(
        `Failed to create AutoPost: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Could not create the AutoPost.');
    }
  }

  async getAutoPostById(id: number): Promise<PublicAutoPost | null> {
    this.logger.log(`Fetching AutoPost with ID: ${id}`);
    const post = await this.prisma.autoPost.findUnique({
      where: { id },
    });
    return this.toPublicAutoPostNullable(post);
  }

  async getAllAutoPosts(
    query: GetAutoPostsQueryDto,
  ): Promise<{ data: PublicAutoPost[]; count: number }> {
    this.logger.log('Fetching all AutoPosts with query:', query);
    const {
      page = 1,
      limit = 10,
      status,
      autoProjectId,
      sortBy = 'scheduled_at',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.AutoPostWhereInput = {};
    if (status) {
      where.status = status;
    }
    if (autoProjectId) {
      where.auto_project_id = autoProjectId;
    }

    const skip = (page - 1) * limit;

    const [posts, count] = await this.prisma.$transaction([
      this.prisma.autoPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.autoPost.count({ where }),
    ]);

    return {
      data: posts.map((post) => this.toPublicAutoPost(post)),
      count,
    };
  }

  async updateAutoPost(
    id: number,
    dto: UpdateAutoPostDto,
  ): Promise<PublicAutoPost> {
    this.logger.log(`Updating AutoPost with ID: ${id}`);
    const existingPost = await this.findAutoPostOrThrow(id);

    if (
      existingPost.status !== AutoPostStatus.PENDING &&
      existingPost.status !== AutoPostStatus.FAILED
    ) {
      throw new BadRequestException(
        `Cannot update post in status: ${existingPost.status}. Only PENDING or FAILED posts can be updated.`,
      );
    }

    const dataToUpdate: Prisma.AutoPostUpdateInput = {};
    if (dto.content !== undefined) dataToUpdate.content = dto.content;
    if (dto.scheduledAt !== undefined)
      dataToUpdate.scheduled_at = new Date(dto.scheduledAt);
    if (dto.imageUrls !== undefined) dataToUpdate.image_urls = dto.imageUrls;

    const hasSubstantiveChanges =
      dto.content || dto.scheduledAt || dto.imageUrls;

    if (
      existingPost.status === AutoPostStatus.FAILED &&
      hasSubstantiveChanges
    ) {
      dataToUpdate.status = AutoPostStatus.PENDING;
      dataToUpdate.error_message = null;
      dataToUpdate.n8n_triggered_at = null;
      dataToUpdate.posted_at = null;
      dataToUpdate.n8n_execution_id = null;
      dataToUpdate.platform_post_id = null;
    }

    const updatedPost = await this.prisma.autoPost.update({
      where: { id },
      data: dataToUpdate,
    });

    return this.toPublicAutoPost(updatedPost);
  }

  async deleteAutoPost(id: number): Promise<void> {
    this.logger.log(`Deleting AutoPost with ID: ${id}`);
    const post = await this.findAutoPostOrThrow(id);

    if (post.status === AutoPostStatus.POSTED) {
      throw new BadRequestException(
        `Cannot delete a post that is ${post.status}. Consider cancelling it instead if it's not yet posted or has failed.`,
      );
    }

    await this.prisma.autoPost.delete({
      where: { id },
    });
    this.logger.log(`Successfully deleted AutoPost ID: ${id}`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPostsTrigger() {
    if (!this.n8nExecutePostWebhookUrl) {
      this.logger.warn('N8N webhook URL not set, skipping post trigger.');
      return;
    }

    const duePosts = await this.prisma.autoPost.findMany({
      where: {
        status: AutoPostStatus.PENDING,
        scheduled_at: {
          lte: new Date(),
        },
      },
      include: {
        autoProject: {
          include: {
            Platform: true,
          },
        },
      },
      orderBy: {
        scheduled_at: 'asc',
      },
      take: 10,
    });

    if (duePosts.length === 0) {
      return;
    }
    this.logger.log(`Found ${duePosts.length} due posts to trigger.`);

    for (const post of duePosts) {
      if (
        !post.autoProject ||
        !post.autoProject.Platform ||
        !post.autoProject.Platform.config
      ) {
        this.logger.error(
          `AutoProject or Platform data missing for AutoPost ID ${post.id}. Marking as FAILED.`,
        );
        await this.prisma.autoPost.update({
          where: { id: post.id },
          data: {
            status: AutoPostStatus.FAILED,
            error_message:
              'Configuration error: AutoProject or Platform details missing.',
          },
        });
        continue;
      }

      const platformConfig = post.autoProject.Platform.config as PlatformConfig;
      const { encryptedFacebookAccessToken, facebookPageId } = platformConfig;

      if (!encryptedFacebookAccessToken || !facebookPageId) {
        this.logger.error(
          `Platform config incomplete (token or pageId missing) for AutoPost ID ${post.id}. Marking as FAILED.`,
        );
        await this.prisma.autoPost.update({
          where: { id: post.id },
          data: {
            status: AutoPostStatus.FAILED,
            error_message:
              'Configuration error: Platform access token or Page ID missing.',
          },
        });
        continue;
      }

      let decryptedAccessToken: string;
      try {
        decryptedAccessToken = this.encryptionService.decrypt(
          encryptedFacebookAccessToken,
        );
      } catch (decryptionError) {
        this.logger.error(
          `Decryption failed for AutoPost ID ${post.id}. Marking as FAILED.`,
          (decryptionError as Error).message,
        );
        await this.prisma.autoPost.update({
          where: { id: post.id },
          data: {
            status: AutoPostStatus.FAILED,
            error_message:
              'Token decryption failed. Please check AutoProject platform configuration.',
          },
        });
        continue;
      }

      try {
        const payloadToN8n = {
          autoPostId: post.id,
          content: post.content,
          facebookPageId: facebookPageId,
          facebookAccessToken: decryptedAccessToken,
          imageUrls: post.image_urls,
        };

        await this.prisma.autoPost.update({
          where: { id: post.id },
          data: {
            n8n_triggered_at: new Date(),
          },
        });

        this.logger.log(
          `Triggering n8n for AutoPost ID: ${post.id} for page ${facebookPageId}`,
        );

        await firstValueFrom(
          this.httpService.post(this.n8nExecutePostWebhookUrl, payloadToN8n),
        );

        this.logger.log(
          `Successfully triggered n8n for AutoPost ID: ${post.id}`,
        );
      } catch (error) {
        const err = error as AxiosError;
        this.logger.error(
          `Failed to trigger n8n for AutoPost ID: ${post.id}`,
          err.response?.data || err.message,
        );

        await this.prisma.autoPost.update({
          where: { id: post.id },
          data: {
            status: AutoPostStatus.FAILED,
            error_message: `Failed to trigger n8n: ${err.message?.substring(0, 250) || 'Unknown n8n trigger error'}`,
          },
        });
      }
    }
  }

  async updateAutoPostStatus(
    dto: UpdateAutoPostStatusDto,
  ): Promise<PublicAutoPost> {
    this.logger.log(
      `Updating status for AutoPost ID ${dto.autoPostId} to ${dto.status}`,
    );

    await this.findAutoPostOrThrow(dto.autoPostId);

    const dataToUpdate: Prisma.AutoPostUpdateInput = {
      status: dto.status,
      error_message: dto.errorMessage,
      n8n_execution_id: dto.n8nExecutionId,
      platform_post_id: dto.platformPostId,
    };

    if (dto.status === AutoPostStatus.POSTED) {
      dataToUpdate.posted_at = new Date();
      dataToUpdate.error_message = null;
    } else if (dto.status !== AutoPostStatus.FAILED) {
      dataToUpdate.error_message = null;
    }

    const updatedPost = await this.prisma.autoPost.update({
      where: { id: dto.autoPostId },
      data: dataToUpdate,
    });

    return this.toPublicAutoPost(updatedPost);
  }

  async cancelAutoPost(autoPostId: number): Promise<PublicAutoPost> {
    this.logger.log(`Cancelling AutoPost ID: ${autoPostId}`);
    const post = await this.findAutoPostOrThrow(autoPostId);

    if (post.status === AutoPostStatus.POSTED) {
      throw new BadRequestException(
        'Cannot cancel a post that has already been posted.',
      );
    }
    if (post.status === AutoPostStatus.CANCELLED) {
      this.logger.warn(`AutoPost ID ${autoPostId} is already cancelled.`);
      return this.toPublicAutoPost(post);
    }

    if (
      post.status !== AutoPostStatus.PENDING &&
      post.status !== AutoPostStatus.FAILED
    ) {
      throw new BadRequestException(
        `Cannot cancel post in status: ${post.status}. Only PENDING or FAILED posts can be cancelled.`,
      );
    }

    const result = await this.prisma.autoPost.update({
      where: { id: autoPostId },
      data: {
        status: AutoPostStatus.CANCELLED,
        error_message: null,
      },
    });

    return this.toPublicAutoPost(result);
  }
}

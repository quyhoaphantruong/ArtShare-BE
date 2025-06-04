import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateAutoProjectDto } from './dto/request/create-project.dto';
import { AutoPostGenerateService } from 'src/auto-post/auto-post-generate.service';
import { SharePlatform } from '@prisma/client';
import { TryCatch } from 'src/common/try-catch.decorator';
import { plainToInstance } from 'class-transformer';
import { AutoProjectDetailsDto } from './dto/response/auto-project-details.dto';
import { UsageService } from 'src/usage/usage.service';
import { FeatureKey } from 'src/common/enum/subscription-feature-key.enum';
import { UpdateAutoProjectDto } from './dto/request/update-project.dto';

@Injectable()
export class AutoProjectWriteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autoPostGenerateService: AutoPostGenerateService,
    private readonly usageService: UsageService,
  ) {}

  private readonly textCost = 2;
  private readonly imageCost = 5;

  @TryCatch()
  async create(
    createDto: CreateAutoProjectDto,
    userId: string,
  ): Promise<AutoProjectDetailsDto> {
    const { title, description, platform_name, auto_post_meta_list } =
      createDto;

    await this.validatePlatform(platform_name as SharePlatform, userId);

    await this.usageService.handleCreditUsage(
      userId,
      FeatureKey.AI_CREDITS,
      this.textCost + this.imageCost * auto_post_meta_list.length,
    );

    // generate auto posts
    const generatedAutoPosts =
      await this.autoPostGenerateService.generateAutoPosts(
        auto_post_meta_list,
        { project_title: title, project_description: description },
        userId,
      );

    // save auto project with auto posts to the db
    const created = await this.prisma.autoProject.create({
      data: {
        title,
        description,
        platform_name: platform_name as SharePlatform,
        user_id: userId,
        autoPosts: {
          create: generatedAutoPosts.map((post) => ({
            content: post.content,
            image_urls: post.imageUrls,
            scheduled_at: post.scheduledAt,
          })),
        },
      },
      include: { autoPosts: true },
    });

    return plainToInstance(AutoProjectDetailsDto, created);
  }

  private async validatePlatform(
    platformName: SharePlatform,
    userId: string,
  ): Promise<void> {
    const platform = await this.prisma.platform.findUnique({
      where: { name: platformName, user_id: userId },
    });
    if (!platform) {
      throw new InternalServerErrorException(
        `Configuration for platform ${platformName} not found for user ${userId}.`,
      );
    }
  }

  @TryCatch()
  async update(
    id: number,
    updateDto: UpdateAutoProjectDto,
    userId: string,
  ): Promise<AutoProjectDetailsDto> {
    const { title, description } = updateDto;

    // Validate if the project exists and belongs to the user
    const existingProject = await this.prisma.autoProject.findFirst({
      where: { id, user_id: userId },
    });

    if (!existingProject) {
      throw new BadRequestException(
        `Auto project with ID ${id} not found or does not belong to user ${userId}.`,
      );
    }

    // Update the project
    const updatedProject = await this.prisma.autoProject.update({
      where: { id },
      data: {
        title,
        description,
      },
      include: { autoPosts: true },
    });

    return plainToInstance(AutoProjectDetailsDto, updatedProject);
  }

  @TryCatch()
  async remove(id: number, userId: string): Promise<void> {
    // Validate if the project exists and belongs to the user
    const existingProject = await this.prisma.autoProject.findFirst({
      where: { id, user_id: userId },
    });

    if (!existingProject) {
      throw new BadRequestException(
        `Auto project with ID ${id} not found or does not belong to user ${userId}.`,
      );
    }

    // Delete the project
    await this.prisma.autoProject.delete({
      where: { id },
    });
  }
}

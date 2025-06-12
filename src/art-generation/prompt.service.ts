import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UpdatePromptHistoryDto } from './dto/request/update-prompt-history.dto';
import { TryCatch } from 'src/common/try-catch.decorator';
import { ImageGenerationResponseDto } from './dto/response/image-generation.dto';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PromptService {
  constructor(private readonly prisma: PrismaClient) {}

  @TryCatch()
  async getPromptHistory(
    userId: string,
  ): Promise<ImageGenerationResponseDto[]> {
    const promptHistory = await this.prisma.artGeneration.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return plainToInstance(ImageGenerationResponseDto, promptHistory);
  }

  @TryCatch()
  async updatePromptHistory(
    promptId: number,
    updatePromptHistoryDto: UpdatePromptHistoryDto,
  ): Promise<ImageGenerationResponseDto> {
    const existingPromptHistory =
      await this.prisma.artGeneration.findUnique({
        where: {
          id: promptId,
        },
      });
    if (!existingPromptHistory) {
      throw new NotFoundException(
        `Prompt history with id = ${promptId} not found`,
      );
    }
    const updatedPromptHistory = await this.prisma.artGeneration.update({
      where: {
        id: promptId,
      },
      data: {
        image_urls: updatePromptHistoryDto.image_urls,
      },
    });

    return plainToInstance(ImageGenerationResponseDto, updatedPromptHistory);
  }
}

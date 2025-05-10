import { BadRequestException, Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { PrismaService } from "src/prisma.service";
import { PromptHistoryDto } from "./dto/response/prompt-history.dto";
import { UpdatePromptHistoryDto } from "./dto/request/update-prompt-history.dto";
import { TryCatch } from "src/common/try-catch.decorator";

@Injectable()
export class PromptService {
  constructor(
    private readonly prismaService: PrismaService,
  ) {}

  @TryCatch()
  async getPromptHistory(userId: string): Promise<PromptHistoryDto[]> {
    const promptHistory = await this.prismaService.artGeneration.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return plainToInstance(PromptHistoryDto, promptHistory);
  }

  @TryCatch()
  async updatePromptHistory(
    promptId: number,
    updatePromptHistoryDto: UpdatePromptHistoryDto,
  ): Promise<PromptHistoryDto> {
    const existingPromptHistory = await this.prismaService.artGeneration.findUnique({
      where: {
        id: promptId,
      },
    });
    if (!existingPromptHistory) {
      throw new BadRequestException(`Prompt history with id = ${promptId} not found`);
    }
    const updatedPromptHistory = await this.prismaService.artGeneration.update({
      where: {
        id: promptId,
      },
      data: {
        image_urls: updatePromptHistoryDto.image_urls,
      },
    });

    return plainToInstance(PromptHistoryDto, updatedPromptHistory);
  }
}
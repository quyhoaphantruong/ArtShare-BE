import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { PrismaService } from "src/prisma.service";
import { PromptHistoryDto } from "./dto/response/prompt-history.dto";
import { UpdatePromptHistoryDto } from "./dto/request/update-prompt-history.dto";

@Injectable()
export class PromptService {
  constructor(
    private readonly prismaService: PrismaService,
  ) {}

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

  async updatePromptHistory(
    promptId: number,
    updatePromptHistoryDto: UpdatePromptHistoryDto,
  ): Promise<PromptHistoryDto> {
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
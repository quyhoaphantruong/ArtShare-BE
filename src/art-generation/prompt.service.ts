import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { PrismaService } from "src/prisma.service";
import { PromptHistoryDto } from "./dto/response/prompt-history.dto";

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
}
// src/statistics/statistics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';

export interface StatCount {
  key: string;
  count: number;
}

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async rawStats(
    column: string,
    table = 'art_generation',
    alias = 'key',
  ): Promise<StatCount[]> {
    type Row = { [key: string]: string | bigint };
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT
        ${Prisma.raw(column)} AS ${Prisma.raw(alias)},
        COUNT(*)              AS count
      FROM ${Prisma.raw(table)}
      WHERE ${Prisma.raw(column)} IS NOT NULL
      GROUP BY ${Prisma.raw(column)}
      ORDER BY count DESC;
    `;

    return rows.map((r) => ({
      key: r[alias] as unknown as string,
      count: Number(r.count),
    }));
  }

  async getAspectRatioStats(): Promise<StatCount[]> {
    return this.rawStats('aspect_ratio');
  }

  async getLightingStats(): Promise<StatCount[]> {
    return this.rawStats('lighting');
  }

  async getStyles(): Promise<StatCount[]> {
    // replace 'camera_angle' with your actual column name
    return this.rawStats('style');
  }

  async getAll(): Promise<{
    aspectRatios: StatCount[];
    lightings: StatCount[];
    styles: StatCount[];
  }> {
    const [aspectRatios, lightings, styles] = await Promise.all([
      this.getAspectRatioStats(),
      this.getLightingStats(),
      this.getStyles(),
    ]);

    return { aspectRatios, lightings, styles };
  }

  async getRawTrendingPrompts(): Promise<string[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 50);

    const recentArtGenerations = await this.prisma.artGeneration.findMany({
      where: {
        created_at: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 20,
    });

    return recentArtGenerations.map((item) => item.user_prompt);
  }

  async updateTrendingPrompts(
    key: string,
    promptsToUpdate: string[],
  ): Promise<void> {
    this.logger.log(`Updating trending prompts in DB for key: ${key}`);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.trendingPrompt.deleteMany({
          where: { prompt_key: key },
        });

        await tx.trendingPrompt.create({
          data: {
            prompt_key: key,
            prompts: promptsToUpdate,
          },
        });
      });
      this.logger.log(`Successfully updated prompts for key: ${key}`);
    } catch (error) {
      this.logger.error(
        `Failed to update trending prompts for key: ${key}`,
        error,
      );
      throw error;
    }
  }

  async getStoredTrendingPrompts(key: string): Promise<string[] | null> {
    const result = await this.prisma.trendingPrompt.findUnique({
      where: { prompt_key: key },
    });

    return result ? result.prompts : null;
  }
}
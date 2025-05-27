// src/statistics/statistics.service.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';

export interface StatCount {
  key: string;
  count: number;
}

@Injectable()
export class StatisticsService {
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

    return { aspectRatios, lightings, styles};
  }
}

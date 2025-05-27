// src/reports/reports.service.ts

import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { Report, ReportTargetType, Prisma, ReportStatus } from '@prisma/client';
import { ViewTab } from './dto/view-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async createReport(
    createReportDto: CreateReportDto,
    reporterId: string,
  ): Promise<Report> {
    const { target_id, target_type, reason, target_url, user_id } = createReportDto;

    const existingReport = await this.prisma.report.findFirst({
      where: {
        reporter_id: reporterId,
        target_type: target_type,
        status: ReportStatus.PENDING,
        ...(user_id ? { user_id: user_id } : { target_id: target_id }),
      },
    });
    if (existingReport) {
      throw new ConflictException(
        'You have already submitted a report for this item.',
      );
    }

    try {
      const newReport = await this.prisma.report.create({
        data: {
          reporter_id: reporterId,
          target_id: target_id,
          target_type: target_type,
          reason: reason,
          target_url: target_url,
        },
      });
      return newReport;
    } catch (error) {
      console.error(`Failed to create report: ${error}`);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new NotFoundException(
            `Reporter user with ID ${reporterId} not found.`,
          );
        }
      }
      throw new InternalServerErrorException('Could not save the report.');
    }
  }

  async findPendingReports(options: {
    skip?: number;
    take?: number;
  }): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { status: ReportStatus.PENDING },
      include: { reporter: { select: { id: true, username: true } } }, // Example include
      orderBy: { created_at: 'asc' },
      skip: options.skip,
      take: options.take,
    });
  }

  async findReportsByTab(
    tab: ViewTab,
    options: { skip?: number; take?: number },
  ): Promise<Report[]> {
    const where: Prisma.ReportWhereInput = {};

    if (tab !== ViewTab.ALL) {
      if (tab !== ViewTab.USER) {
        // post/blog/comment
        where.target_type = tab.toUpperCase() as ReportTargetType;
      }
    }

    return this.prisma.report.findMany({
      where,
      include: {
        reporter: { select: { id: true, username: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: options.skip,
      take: options.take,
    });
  }

  async updateReportStatus(
    reportId: number,
    status: ReportStatus,
  ): Promise<Report> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report)
      throw new NotFoundException(`Report with ID ${reportId} not found.`);

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: status,
        // moderator_id: moderatorId, // If you add these fields
        // resolved_at: new Date(),   // If you add these fields
      },
    });
  }

  async resolveReport(
  reportId: number,
  dto: ResolveReportDto,
  moderatorId: string,
): Promise<Report> {
  const existing = await this.prisma.report.findUnique({
    where: { id: reportId },
  });
  if (!existing) {
    throw new NotFoundException(`Report ${reportId} not found.`);
  }

  return this.prisma.report.update({
    where: { id: reportId },
    data: {
      status: ReportStatus.RESOLVED,
      resolved_at: new Date(dto.resolve_date),
      resolution_comment: dto.resolution_comment,
      moderator_id: moderatorId,
    },
  });
}
}

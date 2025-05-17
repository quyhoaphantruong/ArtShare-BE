// src/reports/reports.service.ts

import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { Report, ReportTargetType, Prisma, ReportStatus } from '@prisma/client';
import { ViewTab } from './dto/view-report.dto';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  private async validateTargetExists(
    targetId: number,
    targetType: ReportTargetType,
  ): Promise<void> {
    let targetExists = false;
    try {
      switch (targetType) {
        case ReportTargetType.POST:
          if (isNaN(targetId))
            throw new BadRequestException(
              `Invalid Post ID format: ${targetId}`,
            );
          targetExists = !!(await this.prisma.post.findUnique({
            where: { id: targetId },
            select: { id: true },
          }));
          break;
        case ReportTargetType.BLOG:
          if (isNaN(targetId))
            throw new BadRequestException(
              `Invalid Blog ID format: ${targetId}`,
            );
          targetExists = !!(await this.prisma.blog.findUnique({
            where: { id: targetId },
            select: { id: true },
          }));
          break;
        case ReportTargetType.COMMENT:
          if (isNaN(targetId))
            throw new BadRequestException(
              `Invalid Comment ID format: ${targetId}`,
            );
          targetExists = !!(await this.prisma.comment.findUnique({
            where: { id: targetId },
            select: { id: true },
          }));
          break;
        default:
          throw new BadRequestException(
            `Unsupported target type: ${targetType}`,
          );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error(`Error validating target existence: ${error}`);
      throw new InternalServerErrorException('Error checking target entity.');
    }

    if (!targetExists) {
      throw new NotFoundException(
        `Target ${targetType} with ID ${targetId} not found.`,
      );
    }
  }

  async createReport(
    createReportDto: CreateReportDto,
    reporterId: string,
  ): Promise<Report> {
    const { target_id, target_type, reason } = createReportDto;

    await this.validateTargetExists(target_id, target_type);

    const existingReport = await this.prisma.report.findFirst({
      where: {
        reporter_id: reporterId,
        target_id: target_id,
        target_type: target_type,
        status: ReportStatus.PENDING,
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

  // async updateReportStatus(reportId: number, status: ReportStatus, moderatorId: string): Promise<Report> {
  //    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
  //    if (!report) throw new NotFoundException(`Report with ID ${reportId} not found.`);
  //
  //   return this.prisma.report.update({
  //     where: { id: reportId },
  //     data: {
  //       status: status,
  //       // moderator_id: moderatorId, // If you add these fields
  //       // resolved_at: new Date(),   // If you add these fields
  //     },
  //   });
  // }
}

import { Body, Controller, Get, InternalServerErrorException, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { CurrentUser } from 'src/auth/decorators/users.decorator';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { ReportService } from './report.service';
import { Report } from '@prisma/client';
import { ViewReportsDto, ViewTab } from './dto/view-report.dto';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    @Post()
    async submitReport(
        @Body() createReportDto: CreateReportDto,
        @CurrentUser() userInfo: CurrentUserType,
      ): Promise<{ message: string; reportId: number }> {

        const reporterId = userInfo?.id;
        if (!reporterId) {
             throw new InternalServerErrorException('Could not identify reporter from token.');
        }
    
        const newReport: Report = await this.reportService.createReport(
          createReportDto,
          reporterId,
        );
    
        return {
            message: 'Report submitted successfully.',
            reportId: newReport.id,
        };
    }

    @Get('/pending')
    @ApiOperation({ summary: 'Get pending reports (Admin/Moderator)' })
    async getPendingReports(@Query('skip') skip?: string, 
                            @Query('take') take?: string) {
      const options = {
        skip: skip ? parseInt(skip, 10) : undefined,
        take: take ? parseInt(take, 10) : undefined,
      };
      return this.reportService.findPendingReports(options);
    }

    @Post('/view')
    @ApiOperation({ summary: 'Xem tất cả report theo tab: user/post/blog/comment/all' })
    async viewReports(
      @Body() viewReportsDto: ViewReportsDto,
    ): Promise<Report[]> {
      const {
        tab = ViewTab.ALL,
        skip,
        take,
      } = viewReportsDto;
  
      const options = {
        skip: skip ? parseInt(skip, 10) : undefined,
        take: take ? parseInt(take, 10) : undefined,
      };
  
      return this.reportService.findReportsByTab(tab, options);
    }
}

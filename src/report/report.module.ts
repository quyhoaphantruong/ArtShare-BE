import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule, ConfigModule],
  providers: [ReportService],
  controllers: [ReportController],
})
export class ReportModule {}

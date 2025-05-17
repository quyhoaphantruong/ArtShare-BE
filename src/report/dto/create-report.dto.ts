// src/reports/dto/create-report.dto.ts

import { ApiProperty } from '@nestjs/swagger'; // Optional: For Swagger documentation
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReportTargetType } from '../enum/report-target-type.enum';

export class CreateReportDto {
  @ApiProperty({
    description: 'The ID of the entity being reported (Post, Blog, Comment)',
  })
  @IsNotEmpty()
  target_id: number;

  @ApiProperty({
    description: 'The type of entity being reported',
    enum: ReportTargetType,
    example: ReportTargetType.POST,
  })
  @IsEnum(ReportTargetType)
  @IsNotEmpty()
  target_type: ReportTargetType;

  @ApiProperty({
    description: 'The reason for submitting the report',
    example: 'This post contains inappropriate content.',
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  reason: string;
}

import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsArray,
  IsUrl,
  IsOptional,
} from 'class-validator';
import { AutoPostStatus } from '@prisma/client';

export class SchedulePostDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsDateString()
  scheduleAt: string;

  @IsNotEmpty()
  @IsString()
  facebookPageId: string;

  @IsNotEmpty()
  @IsString()
  facebookAccessToken: string;

  @IsArray()
  @IsOptional()
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}

export class UpdatePostStatusDto {
  @IsNotEmpty()
  @IsString()
  scheduleId: string;

  @IsNotEmpty()
  status: AutoPostStatus;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsString()
  n8nExecutionId?: string;
}

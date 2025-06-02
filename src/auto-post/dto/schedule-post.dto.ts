import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsArray,
  IsUrl,
  IsOptional,
  IsIn,
  IsInt,
  Min,
} from 'class-validator';
import { AutoPostStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

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
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  scheduleId: number;

  @IsNotEmpty()
  @IsIn(Object.values(AutoPostStatus))
  status: AutoPostStatus;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsString()
  n8nExecutionId?: string;
}

export class UpdateScheduledPostDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsDateString()
  scheduleAt?: string;

  @IsOptional()
  @IsString()
  facebookPageId?: string;

  @IsOptional()
  @IsString()
  facebookAccessToken?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}

export class GetScheduledPostsQueryDto {
  @IsOptional()
  @IsString()
  facebookPageId?: string;

  @IsOptional()
  @IsIn(Object.values(AutoPostStatus))
  status?: AutoPostStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'scheduleAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

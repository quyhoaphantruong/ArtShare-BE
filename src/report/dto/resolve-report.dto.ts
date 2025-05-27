import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ResolveReportDto {
  @IsDateString()
  resolve_date: string;

  @IsOptional()
  @IsString()
  resolution_comment?: string;
}
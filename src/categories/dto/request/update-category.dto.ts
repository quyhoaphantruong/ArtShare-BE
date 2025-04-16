import { CategoryType } from '@prisma/client';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  cate_name?: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsEnum(CategoryType)
  @IsOptional()
  cate_type?: CategoryType;

  @IsString()
  @IsOptional()
  cate_description?: string;
}

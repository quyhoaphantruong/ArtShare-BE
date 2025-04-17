import { CategoryType } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  cate_name?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  urls?: string[];

  @IsEnum(CategoryType)
  @IsOptional()
  cate_type?: CategoryType;

  @IsString()
  @IsOptional()
  cate_description?: string;
}

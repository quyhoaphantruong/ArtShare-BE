import { CategoryType } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  example_images?: string[];

  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;

  @IsString()
  @IsOptional()
  description?: string;
}

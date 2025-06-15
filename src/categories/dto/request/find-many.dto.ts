import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer'; // You might need this for numbers!
import { CategoryType } from './create-category.dto';

export class FindManyCategoriesDto {
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;

  @IsOptional()
  @IsString()
  search_query?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page_size?: number;
}

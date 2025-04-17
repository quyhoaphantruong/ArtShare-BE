import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray } from 'class-validator';
export enum CategoryType {
  MEDIUM = 'MEDIUM',
  ATTRIBUTE = 'ATTRIBUTE',
}

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  cate_name: string;

  @IsArray()
  @IsString({ each: true })
  urls: string[];

  @IsEnum(CategoryType)
  cate_type: CategoryType;

  @IsString()
  @IsOptional()
  cate_description?: string;
}

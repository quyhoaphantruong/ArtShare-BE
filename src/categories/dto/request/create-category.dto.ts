import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
export enum CategoryType {
  MEDIUM = 'MEDIUM',
  ATTRIBUTE = 'ATTRIBUTE',
}

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  cate_name: string;

  @IsString()
  url: string;

  @IsEnum(CategoryType)
  cate_type: CategoryType;

  @IsString()
  @IsOptional()
  cate_description?: string;
}

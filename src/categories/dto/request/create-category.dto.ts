import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
} from 'class-validator';
export enum CategoryType {
  MEDIUM = 'MEDIUM',
  ATTRIBUTE = 'ATTRIBUTE',
}

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsString({ each: true })
  example_images: string[];

  @IsEnum(CategoryType)
  type: CategoryType;

  @IsString()
  @IsNotEmpty()
  description: string;
}

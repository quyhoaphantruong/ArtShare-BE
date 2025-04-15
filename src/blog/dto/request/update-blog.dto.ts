import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class UpdateBlogDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  pictures?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  embeddedVideos?: string[];
}

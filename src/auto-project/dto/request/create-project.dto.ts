// src/auto-project/dto/create-auto-project.dto.ts
import { IsString, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { SharePlatform } from 'src/common/enum/share-platform.enum';
import { AutoPostMeta } from './auto-post-meta.dto';
import { Type } from 'class-transformer';

export class CreateAutoProjectDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(SharePlatform)
  platform_name: SharePlatform;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutoPostMeta)
  auto_post_meta_list: AutoPostMeta[];
}

// src/auto-project/dto/create-auto-project.dto.ts
import {
  IsString,
  IsArray,
  ValidateNested,
  IsInt,
  IsNotEmpty,
} from 'class-validator';
import { AutoPostMeta } from './auto-post-meta.dto';
import { Type } from 'class-transformer';

export class CreateAutoProjectDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsInt()
  @IsNotEmpty()
  platform_id: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutoPostMeta)
  auto_post_meta_list: AutoPostMeta[];
}

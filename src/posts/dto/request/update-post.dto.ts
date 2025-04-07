import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  @Transform(({ obj, key }) => {
    return obj[key] === 'true' ? true : obj[key] === 'false' ? false : obj[key];
  })
  is_mature: boolean = false;

  @IsBoolean()
  @Transform(({ obj, key }) => {
    return obj[key] === 'true' ? true : obj[key] === 'false' ? false : obj[key];
  })
  ai_created: boolean = false;

  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @IsOptional()
  @IsString()
  video_url?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => JSON.parse(value), { toClassOnly: true })
  cate_ids?: number[];
}

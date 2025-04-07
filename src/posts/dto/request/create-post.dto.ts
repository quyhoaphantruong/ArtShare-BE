import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  video_url?: string;

  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @IsBoolean()
  @Transform(({obj, key}) => {
    return obj[key] === 'true' ? true : obj[key] === 'false' ? false : obj[key];
  })
  is_mature: boolean = false;

  @IsBoolean()
  @Transform(({obj, key}) => {
    return obj[key] === 'true' ? true : obj[key] === 'false' ? false : obj[key];
  })
  ai_created: boolean = false;

  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => JSON.parse(value), { toClassOnly: true })
  cate_ids: number[];
}

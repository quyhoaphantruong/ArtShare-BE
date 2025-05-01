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

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Transform(
    ({ value }) => {
      if (!value) return [];
      try {
        return typeof value === 'string'
          ? JSON.parse(value).map((v: any) => Number(v))
          : Array.isArray(value)
            ? value.map(Number)
            : [];
      } catch {
        return [];
      }
    },
    { toClassOnly: true },
  )
  cate_ids?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(
    ({ value }) => {
      if (!value) return [];
      try {
        return typeof value === 'string'
          ? JSON.parse(value)
          : Array.isArray(value)
            ? value
            : [];
      } catch {
        return [];
      }
    },
    { toClassOnly: true },
  )
  existing_image_urls?: string[];
  
  @IsString()
  thumbnail_crop_meta: string = "{}";
}

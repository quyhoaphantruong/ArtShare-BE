import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePostRequestDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  video_url?: string;

  @IsString()
  @IsNotEmpty()
  thumbnail_url: string;

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

  @IsString()
  thumbnail_crop_meta: string = "{}";

  @IsInt()
  @IsOptional()
  prompt_id?: number;
}

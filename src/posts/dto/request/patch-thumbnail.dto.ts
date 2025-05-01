import { IsNumber, IsOptional } from 'class-validator';

export class PatchThumbnailDto {
  @IsNumber()
  crop_x: number;

  @IsNumber()
  crop_y: number;

  @IsNumber()
  crop_w: number;

  @IsNumber()
  crop_h: number;

  @IsNumber()
  zoom: number;

  @IsNumber()
  @IsOptional()
  aspect?: number; // "free" can be handled as null/undefined in the backend
}

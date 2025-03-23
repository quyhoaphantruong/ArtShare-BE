import { Type } from "class-transformer";
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { MediaDto } from "./media.dto";

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  medias_data: MediaDto[];

  @IsArray()
  @IsInt({ each: true })
  cate_ids: number[];
}
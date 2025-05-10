import { IsArray, IsString } from "class-validator";

export class UpdatePromptHistoryDto {
  @IsArray()
  @IsString({ each: true })
  image_urls: string[];
}
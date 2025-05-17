import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";

export class SearchPostDto {
  @IsString()
  q: string;

  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  page_size?: number = 25;

  @IsString({ each: true })
  @IsOptional()
  @IsArray()
  filter?: string[];
}
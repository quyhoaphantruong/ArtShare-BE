import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateCollectionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  is_private: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  thumbnail_url?: string;
}

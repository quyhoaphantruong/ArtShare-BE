import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateCollectionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.thumbnail_url !== null)
  thumbnail_url?: string | null;
}

import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreatePostDto {

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  is_published: boolean;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}

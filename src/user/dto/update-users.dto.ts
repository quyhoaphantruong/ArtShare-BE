// src/users/dto/update-user.dto.ts
import { IsOptional, IsString, IsEmail, IsUrl, IsDateString } from 'class-validator';

export class UpdateUserDTO {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsUrl()
  profile_picture_url?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsDateString()
  birthday?: string;
}

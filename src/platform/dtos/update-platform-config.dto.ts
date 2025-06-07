import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UpdatePlatformConfigInput {
  @IsString()
  @IsOptional()
  page_name?: string;

  @IsString()
  @IsOptional()
  access_token?: string;

  @IsString()
  @IsOptional()
  category?: string;

  [key: string]: any;
}

export class UpdatePlatformConfigDto {
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdatePlatformConfigInput)
  config: UpdatePlatformConfigInput;
}

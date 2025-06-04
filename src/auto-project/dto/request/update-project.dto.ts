import { IsOptional, IsString } from 'class-validator';

export class UpdateAutoProjectDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

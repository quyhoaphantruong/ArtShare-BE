import {
  IsOptional,
  IsString,
  IsEmail,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^price_[a-zA-Z0-9]+$/, { message: 'Invalid Price ID format' })
  priceId: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}

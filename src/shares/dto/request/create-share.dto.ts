import { IsEnum, IsInt } from 'class-validator';
import { SharePlatform } from 'src/common/enum/share-platform.enum';
import { TargetType } from 'src/common/enum/target-type.enum';

export class CreateShareDto {
  @IsInt()
  target_id: number;

  @IsEnum(TargetType)
  target_type: TargetType; // e.g., POST or BLOG

  @IsEnum(SharePlatform)
  share_platform: SharePlatform; // e.g., FACEBOOK, TWITTER, etc.
}

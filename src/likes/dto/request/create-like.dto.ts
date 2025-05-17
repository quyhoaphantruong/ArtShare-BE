import { IsInt, IsEnum } from 'class-validator';
import { TargetType } from 'src/common/enum/target-type.enum';

export class CreateLikeDto {
  @IsInt()
  target_id: number;

  @IsEnum(TargetType)
  target_type: TargetType;
}

import { TargetType } from "src/common/enum/target-type.enum";

export class LikeDetailsDto {
  user_id: string;
  target_id: number;
  target_type: TargetType;
  created_at: Date;
}

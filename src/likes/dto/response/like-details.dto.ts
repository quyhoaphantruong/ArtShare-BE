import { TargetType } from "@prisma/client";

export class LikeDetailsDto {
  user_id: number;
  target_id: number;
  target_type: TargetType;
  created_at: Date;
}
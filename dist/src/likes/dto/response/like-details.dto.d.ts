import { TargetType } from '@prisma/client';
export declare class LikeDetailsDto {
    user_id: string;
    target_id: number;
    target_type: TargetType;
    created_at: Date;
}

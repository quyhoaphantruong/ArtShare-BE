import { TargetType, SharePlatform } from '@prisma/client';
export declare class CreateShareDto {
    target_id: number;
    target_type: TargetType;
    share_platform: SharePlatform;
}

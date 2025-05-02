import { MediaType } from '@prisma/client';
export declare class MediaResponseDto {
    id: number;
    media_type: MediaType;
    description?: string;
    url: string;
    creator_id: string;
    downloads: number;
    created_at: Date;
}

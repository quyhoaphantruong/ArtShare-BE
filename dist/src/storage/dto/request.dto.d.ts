import { MediaType } from '@prisma/client';
export declare class GetPresignedUrlRequestDto {
    fileName: string;
    extension: string;
    mediaType: MediaType;
    directory?: string;
}

import { MediaType } from '@prisma/client';
import { Expose } from 'class-transformer';

export class MediaResponseDto {
  @Expose() id: number;
  media_type: MediaType;
  description?: string;
  url: string;
  creator_id: string;
  downloads: number;
  created_at: Date;
}

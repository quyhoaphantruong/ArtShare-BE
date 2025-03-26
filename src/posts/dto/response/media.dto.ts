import { MediaType } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class MediaResponseDto {
  @Exclude() id: number;
  media_type: MediaType;
  description?: string;
  url: string;
  creator_id: number;
  downloads: number;
  created_at: Date;
}

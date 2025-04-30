import { PostSummaryDto } from './post-summary.dto';

export class CollectionDto {
  id: number;
  name: string;
  is_private: boolean;
  thumbnail_url?: string;
  description?: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  posts: PostSummaryDto[];
}

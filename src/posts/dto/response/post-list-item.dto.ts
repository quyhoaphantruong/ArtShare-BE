import { Exclude } from 'class-transformer';
import { MediaResponseDto } from './media.dto';
import { UserResponseDto } from './user.dto';
import { PostCategoryResponseDto } from './category.dto';

export class PostListItemResponseDto {
  id: number;
  user_id: string;
  title: string;
  description?: string;
  thumbnail_url: string;
  is_published: boolean;
  is_private: boolean;
  like_count: number;
  share_count: number;
  comment_count: number;
  created_at: Date;

  medias: MediaResponseDto[];

  user: UserResponseDto;

  @Exclude() categories: PostCategoryResponseDto[];

  isLikedByCurrentUser: boolean;
}

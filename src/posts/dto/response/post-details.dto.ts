import { Exclude, Type } from 'class-transformer';
import { MediaResponseDto } from './media.dto';
import { UserResponseDto } from './user.dto';
import { CategoryResponseDto } from './category.dto';

export class PostDetailsResponseDto {
  id: number;
  @Exclude() user_id: number;
  title: string;
  description?: string;
  thumbnail_url: string;
  is_published: boolean;
  is_private: boolean;
  like_count: number;
  share_count: number;
  comment_count: number;
  created_at: Date;

  @Type(() => MediaResponseDto)
  medias: MediaResponseDto[];

  @Type(() => UserResponseDto)
  user: UserResponseDto;

  @Type(() => CategoryResponseDto)
  categories: CategoryResponseDto[];
}

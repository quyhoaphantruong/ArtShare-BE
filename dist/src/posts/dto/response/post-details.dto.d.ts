import { MediaResponseDto } from './media.dto';
import { UserResponseDto } from './user.dto';
import { CategoryResponseDto } from './category.dto';
export declare class PostDetailsResponseDto {
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
    categories: CategoryResponseDto[];
}

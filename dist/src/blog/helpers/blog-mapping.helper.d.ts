import { Prisma } from '@prisma/client';
import { BlogDetailsResponseDto } from '../dto/response/blog-details.dto';
import { BlogListItemResponseDto } from '../dto/response/blog-list-item.dto';
export declare const blogListItemSelect: {
    id: boolean;
    title: boolean;
    created_at: boolean;
    like_count: boolean;
    comment_count: boolean;
    share_count: boolean;
    view_count: boolean;
    is_published: boolean;
    user: {
        select: {
            id: boolean;
            username: boolean;
            profile_picture_url: boolean;
        };
    };
};
export type BlogForListItemPayload = Prisma.BlogGetPayload<{
    select: typeof blogListItemSelect;
}>;
export type BlogWithUser = Prisma.BlogGetPayload<{
    include: {
        user: {
            select: {
                id: true;
                username: true;
                profile_picture_url: true;
            };
        };
    };
}>;
export declare const mapBlogToDetailsDto: (blog: BlogWithUser | null) => BlogDetailsResponseDto | null;
export declare const mapBlogToListItemDto: (blog: BlogForListItemPayload | null) => BlogListItemResponseDto | null;

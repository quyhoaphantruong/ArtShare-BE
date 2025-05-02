"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapBlogToListItemDto = exports.mapBlogToDetailsDto = exports.blogListItemSelect = void 0;
exports.blogListItemSelect = {
    id: true,
    title: true,
    created_at: true,
    like_count: true,
    comment_count: true,
    share_count: true,
    view_count: true,
    is_published: true,
    user: {
        select: {
            id: true,
            username: true,
            profile_picture_url: true,
        },
    },
};
const mapBlogToDetailsDto = (blog) => {
    if (!blog || !blog.user) {
        console.warn(`Blog with ID ${blog?.id ?? 'unknown'} is missing expected user relation for DTO mapping.`);
        return null;
    }
    return {
        id: blog.id,
        title: blog.title,
        content: blog.content,
        created_at: blog.created_at,
        updated_at: blog.updated_at,
        is_published: blog.is_published,
        like_count: blog.like_count,
        comment_count: blog.comment_count,
        share_count: blog.share_count,
        view_count: blog.view_count,
        pictures: blog.pictures,
        embeddedVideos: blog.embedded_videos,
        user: {
            id: blog.user.id,
            username: blog.user.username,
            profile_picture_url: blog.user.profile_picture_url,
        },
    };
};
exports.mapBlogToDetailsDto = mapBlogToDetailsDto;
const mapBlogToListItemDto = (blog) => {
    if (!blog) {
        return null;
    }
    if (!blog.user) {
        console.warn(`Blog with ID ${blog.id} is missing expected user relation for DTO mapping (unexpected for selected payload).`);
        return null;
    }
    return {
        id: blog.id,
        title: blog.title,
        created_at: blog.created_at,
        like_count: blog.like_count,
        comment_count: blog.comment_count,
        share_count: blog.share_count,
        view_count: blog.view_count,
        is_published: blog.is_published,
        user: {
            id: blog.user.id,
            username: blog.user.username,
            profile_picture_url: blog.user.profile_picture_url,
        },
    };
};
exports.mapBlogToListItemDto = mapBlogToListItemDto;

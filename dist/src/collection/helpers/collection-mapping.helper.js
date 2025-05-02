"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapCollectionToDto = exports.collectionWithPostsSelect = void 0;
exports.collectionWithPostsSelect = {
    id: true,
    name: true,
    description: true,
    is_private: true,
    thumbnail_url: true,
    user_id: true,
    created_at: true,
    updated_at: true,
    posts: {
        select: {
            id: true,
            title: true,
            thumbnail_url: true,
            created_at: true,
        },
        orderBy: {
            created_at: 'desc',
        },
    },
};
const mapSelectedPostToSummaryDto = (post) => ({
    id: post.id,
    title: post.title,
    thumbnail_url: post.thumbnail_url ?? undefined,
    created_at: post.created_at,
});
const mapCollectionToDto = (collection) => {
    const sortedPosts = [...collection.posts]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(mapSelectedPostToSummaryDto)
        .map((post) => ({
        id: post.id,
        title: post.title,
        thumbnail_url: post.thumbnail_url ?? undefined,
        created_at: post.created_at,
    }));
    return {
        id: collection.id,
        name: collection.name,
        is_private: collection.is_private,
        thumbnail_url: collection.thumbnail_url ?? undefined,
        description: collection.description ?? undefined,
        user_id: collection.user_id,
        created_at: collection.created_at,
        updated_at: collection.updated_at,
        posts: sortedPosts,
    };
};
exports.mapCollectionToDto = mapCollectionToDto;

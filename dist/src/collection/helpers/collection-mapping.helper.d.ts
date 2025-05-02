import { Collection, Post, Prisma } from '@prisma/client';
import { CollectionDto } from '../dto/response/collection.dto';
export type CollectionWithPosts = Collection & {
    posts: Post[];
};
export declare const collectionWithPostsSelect: {
    id: true;
    name: true;
    description: true;
    is_private: true;
    thumbnail_url: true;
    user_id: true;
    created_at: true;
    updated_at: true;
    posts: {
        select: {
            id: true;
            title: true;
            thumbnail_url: true;
            created_at: true;
        };
        orderBy: {
            created_at: "desc";
        };
    };
};
export type SelectedCollectionPayload = Prisma.CollectionGetPayload<{
    select: typeof collectionWithPostsSelect;
}>;
export declare const mapCollectionToDto: (collection: SelectedCollectionPayload) => CollectionDto;

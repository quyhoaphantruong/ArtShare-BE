export declare class CreatePostDto {
    title: string;
    description?: string;
    video_url?: string;
    thumbnail_url: string;
    is_mature: boolean;
    ai_created: boolean;
    cate_ids?: number[];
}

export declare class UpdatePostDto {
    title?: string;
    description?: string;
    is_mature: boolean;
    ai_created: boolean;
    thumbnail_url?: string;
    video_url?: string;
    cate_ids?: number[];
    existing_image_urls?: string[];
}

import { CategoryType } from '../request/create-category.dto';
export declare class CategoryResponseDto {
    id: number;
    name: string;
    description: string;
    example_images: string[];
    type: CategoryType;
    created_at: Date;
    updated_at: Date;
}

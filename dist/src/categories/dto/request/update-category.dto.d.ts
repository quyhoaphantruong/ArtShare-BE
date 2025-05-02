import { CategoryType } from '@prisma/client';
export declare class UpdateCategoryDto {
    name?: string;
    example_images?: string[];
    type?: CategoryType;
    description?: string;
}

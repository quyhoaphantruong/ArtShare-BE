export declare enum CategoryType {
    MEDIUM = "MEDIUM",
    ATTRIBUTE = "ATTRIBUTE"
}
export declare class CreateCategoryDto {
    name: string;
    example_images: string[];
    type: CategoryType;
    description?: string;
}

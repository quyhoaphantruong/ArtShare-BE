import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/request/create-category.dto';
import { UpdateCategoryDto } from './dto/request/update-category.dto';
import { CategoryResponseDto } from './dto/response/category.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto>;
    findAll(): Promise<CategoryResponseDto[]>;
    findOne(id: number): Promise<CategoryResponseDto>;
    update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto>;
    remove(id: number): Promise<CategoryResponseDto>;
}

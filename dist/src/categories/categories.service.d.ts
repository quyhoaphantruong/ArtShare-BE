import { CreateCategoryDto } from './dto/request/create-category.dto';
import { UpdateCategoryDto } from './dto/request/update-category.dto';
import { PrismaService } from 'src/prisma.service';
import { CategoryResponseDto } from './dto/response/category.dto';
export declare class CategoriesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto>;
    findAll(): Promise<CategoryResponseDto[]>;
    findOne(id: number): Promise<CategoryResponseDto>;
    update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto>;
    remove(id: number): Promise<CategoryResponseDto>;
    private checkCategoryExists;
}

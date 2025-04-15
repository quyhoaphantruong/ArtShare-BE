import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/request/create-category.dto';
import { UpdateCategoryDto } from './dto/request/update-category.dto';
import { PrismaService } from 'src/prisma.service';
import { TryCatch } from 'src/common/try-catch.decorator';
import { CategoryResponseDto } from './dto/response/category.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  @TryCatch()
  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const createdCategory = await this.prisma.category.create({
      data: createCategoryDto,
    });

    return plainToInstance(CategoryResponseDto, createdCategory);
  }

  @TryCatch()
  async findAll(): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany();

    return plainToInstance(CategoryResponseDto, categories);
  }

  @TryCatch()
  async findOne(id: number): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new BadRequestException(`Category with id ${id} not found`);
    }
    return plainToInstance(CategoryResponseDto, category);
  }

  @TryCatch()
  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    await this.checkCategoryExists(id);

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });

    return plainToInstance(CategoryResponseDto, updatedCategory);
  }

  @TryCatch()
  async remove(id: number): Promise<CategoryResponseDto> {
    await this.checkCategoryExists(id);

    const deletedCategory = await this.prisma.category.delete({
      where: { id },
    });
    return plainToInstance(CategoryResponseDto, deletedCategory);
  }

  private async checkCategoryExists(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new BadRequestException(`Category with id ${id} not found`);
    }
  }
}

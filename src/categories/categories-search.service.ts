import { BadRequestException, Injectable } from '@nestjs/common';
import { CategoryResponseDto } from './dto/response/category.dto';
import { PrismaService } from 'src/prisma.service';
import { TryCatch } from 'src/common/try-catch.decorator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CategoriesSearchService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  @TryCatch()
  async findAll(page: number, page_size: number): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      skip: (page - 1) * page_size,
      take: page_size,
      orderBy: { created_at: 'desc' },
    });

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
}

import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/request/create-category.dto';
import { UpdateCategoryDto } from './dto/request/update-category.dto';
import { CategoryResponseDto } from './dto/response/category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  async findAll(): Promise<CategoryResponseDto[]>  {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<CategoryResponseDto> {
    return this.categoriesService.findOne(Number(id));
  }

  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() updateCategoryDto: UpdateCategoryDto
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(Number(id), updateCategoryDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: number): Promise<CategoryResponseDto> {
    return this.categoriesService.remove(Number(id));
  }
}
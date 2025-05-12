import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/request/create-category.dto';
import { UpdateCategoryDto } from './dto/request/update-category.dto';
import { PrismaService } from 'src/prisma.service';
import { TryCatch } from 'src/common/try-catch.decorator';
import { CategoryResponseDto } from './dto/response/category.dto';
import { plainToInstance } from 'class-transformer';
import { QdrantClient } from '@qdrant/js-client-rest';
import { EmbeddingService } from 'src/embedding/embedding.service';
import { VECTOR_DIMENSION } from 'src/embedding/embedding.utils';
import { SyncEmbeddingResponseDto } from '../common/response/sync-embedding.dto';
import { Category } from '@prisma/client';

@Injectable()
export class CategoriesManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qdrantClient: QdrantClient,
    private readonly embeddingService: EmbeddingService,
  ) {}

  private readonly INVALID_DESCRIPTION_ERROR =
    'Description cannot be null or empty or contain only whitespace';

  private readonly categoriesCollectionName = 'categories';

  private async ensureCategoriesCollectionExists() {
    const collectionInfo = await this.qdrantClient.collectionExists(
      this.categoriesCollectionName,
    );
    if (!collectionInfo.exists) {
      await this.qdrantClient.createCollection(this.categoriesCollectionName, {
        vectors: {
          description: { size: VECTOR_DIMENSION, distance: 'Cosine' },
        },
      });
      console.log('Collection categories created successfully');
    }
  }

  @TryCatch()
  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    await this.verifyCreateRequest(createCategoryDto);

    await this.ensureCategoriesCollectionExists();

    const createdCategory = await this.prisma.category.create({
      data: createCategoryDto,
    });

    this.upsertCategoryEmbeddings([createdCategory]);

    return plainToInstance(CategoryResponseDto, createdCategory);
  }

  @TryCatch()
  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    await this.verifyUpdateRequest(updateCategoryDto);

    await this.checkCategoryExists(id);

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });

    this.upsertCategoryEmbeddings([updatedCategory]);

    return plainToInstance(CategoryResponseDto, updatedCategory);
  }

  private async verifyCreateRequest(
    createCategoryDto: CreateCategoryDto,
  ): Promise<void> {
    if (this.isInvalidDescription(createCategoryDto.description)) {
      throw new BadRequestException(this.INVALID_DESCRIPTION_ERROR);
    }
  }

  private async verifyUpdateRequest(
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<void> {
    if (
      updateCategoryDto.description !== undefined &&
      this.isInvalidDescription(updateCategoryDto.description)
    ) {
      throw new BadRequestException(this.INVALID_DESCRIPTION_ERROR);
    }
  }

  private isInvalidDescription(description: string): boolean {
    return description == null || description.trim() === '';
  }

  @TryCatch()
  async remove(id: number): Promise<CategoryResponseDto> {
    await this.checkCategoryExists(id);

    const deletedCategory = await this.prisma.category.delete({
      where: { id },
    });

    // Remove the category embedding from Qdrant
    await this.qdrantClient.delete(this.categoriesCollectionName, {
      wait: true,
      points: [id],
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

  @TryCatch()
  async syncEmbeddings(): Promise<SyncEmbeddingResponseDto> {
    // Check if the collection exists
    const collectionInfo = await this.qdrantClient.collectionExists(
      this.categoriesCollectionName,
    );
    console.log('Collection info:', collectionInfo);
    if (collectionInfo.exists === false) {
      throw new BadRequestException(
        `Collection ${this.categoriesCollectionName} does not exist`,
      );
    }

    const categories: Category[] = await this.prisma.category.findMany();
    if (categories.length === 0) {
      return {
        message: 'No categories found to sync',
        count: 0,
        syncedItems: [],
      };
    }

    await this.upsertCategoryEmbeddings(categories);

    return {
      message: 'Category embeddings synced successfully',
      count: categories.length,
      syncedItems: categories.map((category) => category.name),
    };
  }

  // Performs the insert + update action on specified points. Any point with an existing {id} will be overwritten.
  @TryCatch()
  async upsertCategoryEmbeddings(categories: Category[]): Promise<void> {
    if (categories.length === 0) {
      return;
    }

    const points = await Promise.all(
      categories.map(async (c) => {
        if (this.isInvalidDescription(c.description)) {
          // If description is null or just whitespace, it's an issue.
          // This should ideally be caught by DTO validation earlier for create/update.
          // For sync operations, this might indicate legacy data that needs fixing.
          throw new BadRequestException(
            `Category '${c.name}' (ID: ${c.id}): ${this.INVALID_DESCRIPTION_ERROR}`,
          );
        }
        const embedding = await this.embeddingService.generateEmbeddingFromText(
          c.description,
        );
        return {
          id: c.id,
          vector: {
            description: embedding,
          },
          payload: {
            name: c.name,
            description: c.description,
          },
        };
      }),
    );

    const operationInfo = await this.qdrantClient.upsert(
      this.categoriesCollectionName,
      {
        wait: true,
        points: points,
      },
    );
    console.log('Upsert category embedding operation info:', operationInfo);
  }
}

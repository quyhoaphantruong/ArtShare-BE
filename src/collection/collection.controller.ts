import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CurrentUser } from 'src/auth/decorators/users.decorator';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { CollectionDto } from './dto/response/collection.dto';
import { CreateCollectionDto } from './dto/request/create-collection.dto';
import { UpdateCollectionDto } from './dto/request/update-collection.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('collections')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  /**
   * GET /collections - Get all collections for the currently authenticated user
   */
  @Get()
  async getUserCollections(
    @CurrentUser() user: CurrentUserType,
  ): Promise<CollectionDto[]> {
    return this.collectionService.getUserCollections(user.id);
  }

  /**
   * GET /collections/:id - Get details for a specific collection owned by the user
   */
  @Get(':id')
  async getCollectionDetails(
    @Param('id', ParseIntPipe) collectionId: number,
    @CurrentUser() user: CurrentUserType,
  ): Promise<CollectionDto> {
    return this.collectionService.getCollectionDetails(collectionId, user.id);
  }

  /**
   * POST /collections - Create a new collection for the authenticated user
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCollection(
    @Body() createCollectionDto: CreateCollectionDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<CollectionDto> {
    return this.collectionService.createCollection(
      createCollectionDto,
      user.id,
    );
  }

  /**
   * PATCH /collections/:id - Update a specific collection owned by the user
   * Allows updating name, description, privacy, thumbnail, and adding a post.
   */
  @Patch(':id')
  async updateCollection(
    @Param('id', ParseIntPipe) collectionId: number,
    @Body() updateCollectionDto: UpdateCollectionDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<CollectionDto> {
    return this.collectionService.updateCollection(
      collectionId,
      updateCollectionDto,
      user.id,
    );
  }

  /**
   * POST /collections/:collectionId/posts/:postId - Add a post to a collection
   */
  @Post(':collectionId/posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async addPostToCollection(
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('postId', ParseIntPipe) postId: number,
    @CurrentUser() user: CurrentUserType,
  ): Promise<void> {
    await this.collectionService.addPostToCollection(
      collectionId,
      postId,
      user.id,
    );
  }

  /**
   * DELETE /collections/:collectionId/posts/:postId - Remove a post from a collection owned by the user
   */
  @Delete(':collectionId/posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePostFromCollection(
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('postId', ParseIntPipe) postId: number,
    @CurrentUser() user: CurrentUserType,
  ): Promise<void> {
    await this.collectionService.removePostFromCollection(
      collectionId,
      postId,
      user.id,
    );
  }

  /**
   * DELETE /collections/:id - Delete a specific collection owned by the user
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCollection(
    @Param('id', ParseIntPipe) collectionId: number,
    @CurrentUser() user: CurrentUserType,
  ): Promise<void> {
    await this.collectionService.removeCollection(collectionId, user.id);
  }
}

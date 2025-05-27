import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PostDetailsResponseDto } from './dto/response/post-details.dto';
import { UpdatePostDto } from './dto/request/update-post.dto';
import { PostListItemResponseDto } from './dto/response/post-list-item.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/auth/decorators/users.decorator';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Public } from 'src/auth/decorators/public.decorator';
import { PostsManagementService } from './posts-management.service';
import { PostsExploreService } from './posts-explore.service';
import { PatchThumbnailDto } from './dto/request/patch-thumbnail.dto';
import { SearchPostDto } from './dto/request/search-post.dto';
import { WorkflowAssistService } from './workflow-assist.service';
import { GeneratePostMetadataResponseDto } from './dto/response/generate-post-metadata.dto';
import { SyncEmbeddingResponseDto } from 'src/common/response/sync-embedding.dto';
import { CreatePostRequestDto } from './dto/request/create-post.dto';
import { PostsEmbeddingService } from './posts-embedding.service';
import { LikingUserResponseDto } from 'src/likes/dto/response/liking-user-response.dto';
import { TargetType } from 'src/common/enum/target-type.enum';
import { LikesService } from 'src/likes/likes.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(
    private readonly postsManagementService: PostsManagementService,
    private readonly postsExploreService: PostsExploreService,
    private readonly workflowAssistService: WorkflowAssistService,
    private readonly postsEmbeddingService: PostsEmbeddingService,
    private readonly likesService: LikesService
  ) { }

  @Post()
  @UseInterceptors(FilesInterceptor('images'))
  async createPost(
    @Body() request: CreatePostRequestDto,
    @UploadedFiles() images: Express.Multer.File[],
    @CurrentUser() user: CurrentUserType,
  ): Promise<any> {
    return this.postsManagementService.createPost(request, images, user.id);
  }

  @Patch(':post_id')
  @UseInterceptors(FilesInterceptor('images'))
  async updatePost(
    @Param('post_id', ParseIntPipe) postId: number,
    @Body() updatePostDto: UpdatePostDto,
    @UploadedFiles() images: Express.Multer.File[],
    @CurrentUser() user: CurrentUserType,
  ): Promise<PostDetailsResponseDto> {
    return this.postsManagementService.updatePost(
      postId,
      updatePostDto,
      images,
      user.id,
    );
  }

  @Delete(':post_id')
  async deletePost(@Param('post_id', ParseIntPipe) postId: number) {
    return this.postsManagementService.deletePost(postId);
  }

  @Post('search')
  @Public()
  async searchPosts(
    @Body() body: SearchPostDto,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<PostListItemResponseDto[]> {
    return this.postsExploreService.searchPosts(body, user?.id ?? '');
  }

  @Post('for-you')
  async getForYouPosts(
    @Body() body: { page: number; page_size: number; filter: string[] },
    @CurrentUser() user: CurrentUserType,
  ): Promise<PostListItemResponseDto[]> {
    const { page = 1, page_size = 25, filter } = body;

    return this.postsExploreService.getForYouPosts(
      user.id,
      page,
      page_size,
      filter,
    );
  }

  @Post('following')
  async getFollowingPosts(
    @Body() body: { page: number; page_size: number; filter: string[] },
    @CurrentUser() user: CurrentUserType,
  ): Promise<PostListItemResponseDto[]> {
    const { page = 1, page_size = 24, filter } = body;

    return this.postsExploreService.getFollowingPosts(
      user.id,
      page,
      page_size,
      filter,
    );
  }

  @Public()
  @Get('/ai-trending')
  async getAiTrendingPosts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('page_size', new DefaultValuePipe(25), ParseIntPipe)
    pageSize: number,
  ): Promise<PostListItemResponseDto[]> {
    return this.postsExploreService.getAiTrendingPosts(
      page,
      pageSize,
    );
  }


  @Public()
  @Get('user/:username')
  async findPostsByUsername(
    @Param('username') username: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('page_size', new DefaultValuePipe(25), ParseIntPipe)
    pageSize: number,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<PostListItemResponseDto[]> {
    return this.postsExploreService.findPostsByUsername(
      username,
      page,
      pageSize,
      user?.id ?? '',
    );
  }

  @Patch(':id/thumbnail-crop')
  async patchThumbnailCropMeta(
    @Param('id', ParseIntPipe) postId: number,
    @Body() dto: PatchThumbnailDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.postsManagementService.updateThumbnailCropMeta(
      postId,
      dto,
      user.id,
    );
  }

  @Public()
  @Get(':post_id/relevant')
  async getRelevantPosts(
    @Param('post_id', ParseIntPipe) postId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('page_size', new DefaultValuePipe(25), ParseIntPipe)
    pageSize: number,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<PostListItemResponseDto[]> {
    return this.postsExploreService.getRelevantPosts(
      postId,
      page,
      pageSize,
      user?.id ?? '',
    );
  }

  @Post('sync-embeddings')
  async syncPostsEmbedding(): Promise<SyncEmbeddingResponseDto> {
    return this.postsEmbeddingService.syncPostEmbeddings();
  }

  @Post('generate-metadata')
  @UseInterceptors(FilesInterceptor('images'))
  @UseGuards(JwtAuthGuard)
  async generatePostMetadata(
    @UploadedFiles() images: Express.Multer.File[],
    @CurrentUser() user: CurrentUserType,
  ): Promise<GeneratePostMetadataResponseDto> {
    return this.workflowAssistService.generatePostMetadata(images, user.id);
  }

  /** GET /posts/:id/likes?skip=0&take=20 */
  @Public()
  @Get(':id/likes')
  async getPostLikes(
    @Param('id', ParseIntPipe) id: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<{ items: LikingUserResponseDto[]; total: number }> {
    return this.likesService.getLikingUsers(
      id,
      TargetType.POST,
      user?.id ?? null,
      skip,
      take,
    );
  }

  @Public()
  @Get(':post_id')
  async getPostDetails(
    @Param('post_id', ParseIntPipe) postId: number,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<PostDetailsResponseDto> {
    return this.postsExploreService.getPostDetails(postId, user?.id ?? '');
  }
}

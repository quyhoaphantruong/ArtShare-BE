import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
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
import { Roles } from 'src/auth/decorators/roles.decorators';
import { Role } from 'src/auth/enums/role.enum';
import { AdminPostListItemDto, PostsAdminService } from './posts-admin.service';
import { GetAllPostsAdminQueryDto } from './dto/request/get-all-posts-admin.dto';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(
    private readonly postsManagementService: PostsManagementService,
    private readonly postsExploreService: PostsExploreService,
    private readonly workflowAssistService: WorkflowAssistService,
    private readonly postsEmbeddingService: PostsEmbeddingService,
    private readonly likesService: LikesService,
    private readonly postsAdminService: PostsAdminService,
  ) {}

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

  @Public()
  @Get('search')
  @Public()
  async searchPosts(
    @Query() query: SearchPostDto,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<PostListItemResponseDto[]> {
    console.log('searchPosts query:', query);
    return this.postsExploreService.searchPosts(query, user?.id ?? '');
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
  @Get(':post_id')
  async getPostDetails(
    @Param('post_id', ParseIntPipe) postId: number,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<PostDetailsResponseDto> {
    return this.postsExploreService.getPostDetails(postId, user?.id ?? '');
  }

  @Public()
  @Get('/ai-trending')
  async getAiTrendingPosts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('page_size', new DefaultValuePipe(25), ParseIntPipe)
    pageSize: number,
  ): Promise<PostListItemResponseDto[]> {
    return this.postsExploreService.getAiTrendingPosts(page, pageSize);
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

  @Get('admin/all')
  @Roles(Role.ADMIN)
  async getAllPostsForAdmin(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    queryDto: GetAllPostsAdminQueryDto,
  ): Promise<{ posts: AdminPostListItemDto[]; total: number }> {
    const params = {
      page: queryDto.page ?? 1,
      pageSize: queryDto.pageSize ?? 10,
      searchTerm: queryDto.searchTerm,
      userId: queryDto.userId,

      isPublished:
        queryDto.isPublished === 'true'
          ? true
          : queryDto.isPublished === 'false'
            ? false
            : undefined,
      isPrivate:
        queryDto.isPrivate === 'true'
          ? true
          : queryDto.isPrivate === 'false'
            ? false
            : undefined,
      sortBy: queryDto.sortBy ?? 'created_at',
      sortOrder: queryDto.sortOrder ?? 'desc',
    };

    return this.postsAdminService.getAllPostsForAdmin(
      params /*, adminUser.id */,
    );
  }

  @Patch('admin/:post_id')
  @Roles(Role.ADMIN)
  async adminUpdatePost(
    @Param('post_id', ParseIntPipe) postId: number,
    @Body(ValidationPipe) updatePostDto: UpdatePostDto,

    @CurrentUser() adminUser: CurrentUserType,
  ): Promise<PostDetailsResponseDto> {
    return this.postsAdminService.updatePostByAdmin(
      postId,
      updatePostDto,
      adminUser.id,
    );
  }

  @Delete('admin/bulk-delete')
  @Roles(Role.ADMIN)
  async bulkDeletePosts(
    @Body() body: { postIds: number[] },
    @CurrentUser() adminUser: CurrentUserType,
  ): Promise<{ count: number }> {
    return this.postsAdminService.bulkDeletePosts(body.postIds, adminUser.id);
  }

  @Delete('admin/:post_id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async adminDeletePost(
    @Param('post_id', ParseIntPipe) postId: number,
    @CurrentUser() adminUser: CurrentUserType,
  ): Promise<void> {
    await this.postsAdminService.deletePostByAdmin(postId, adminUser.id);
  }
}

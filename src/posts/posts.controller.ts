import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreatePostDto } from './dto/request/create-post.dto';
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
import { SearchPostDto } from './dto/request/search-post.dto';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsManagementService: PostsManagementService,
    private readonly postsExploreService: PostsExploreService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images'))
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @UploadedFiles() images: Express.Multer.File[],
    @CurrentUser() user: CurrentUserType,
  ): Promise<any> {
    return this.postsManagementService.createPost(
      createPostDto,
      images,
      user.id,
    );
  }

  @Patch(':post_id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images'))
  async updatePost(
    @Param('post_id') postId: number,
    @Body() updatePostDto: UpdatePostDto,
    @UploadedFiles() images: Express.Multer.File[],
    @CurrentUser() user: CurrentUserType,
  ): Promise<PostDetailsResponseDto> {
    return this.postsManagementService.updatePost(
      Number(postId),
      updatePostDto,
      images,
      user.id,
    );
  }

  @Delete(':post_id')
  @UseGuards(JwtAuthGuard)
  async deletePost(@Param('post_id') postId: number) {
    return this.postsManagementService.deletePost(Number(postId));
  }

  @Post('search')
  async searchPosts(
    @Body() body: SearchPostDto,
  ): Promise<PostListItemResponseDto[]> {
    return this.postsExploreService.searchPosts(body);
  }

  @Post('for-you')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
    @Param('post_id') postId: number,
  ): Promise<PostDetailsResponseDto> {
    return this.postsExploreService.getPostDetails(Number(postId));
  }

  @Get('user/:username')
  async findPostsByUsername(
    @Param('username') username: string,
    @Query('page') page: string = '1',
    @Query('page_size') pageSize: string = '25',
  ): Promise<PostListItemResponseDto[]> {
    return this.postsExploreService.findPostsByUsername(
      username,
      Number(page),
      Number(pageSize),
    );
  }

  @Get(':post_id/relevant')
  async getRelevantPosts(
    @Param('post_id') postId: number,
    @Query('page') page: string = '1',
    @Query('page_size') pageSize: string = '25',
  ): Promise<PostListItemResponseDto[]> {
    return this.postsExploreService.getRelevantPosts(
      Number(postId),
      Number(page),
      Number(pageSize),
    );
  }
}

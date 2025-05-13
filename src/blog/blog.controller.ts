import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Query,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateBlogDto } from './dto/request/create-blog.dto';
import { UpdateBlogDto } from './dto/request/update-blog.dto';
import { GetBlogsQueryDto } from './dto/request/get-blogs-query.dto';
import { RateBlogDto } from './dto/request/rate-blog.dto';

import { BlogListItemResponseDto } from './dto/response/blog-list-item.dto';
import { BlogDetailsResponseDto } from './dto/response/blog-details.dto';
import { BookmarkResponseDto } from './dto/response/bookmark-response.dto';
import { ProtectResponseDto } from './dto/response/protect-response.dto';
import { RatingResponseDto } from './dto/response/rating-response.dto';

import { CurrentUser } from 'src/auth/decorators/users.decorator';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PaginationDto } from './dto/request/pagination.dto';
import { BlogManagementService } from './blog-management.service';
import { BlogExploreService } from './blog-explore.service';

@UseGuards(JwtAuthGuard)
@Controller('blogs')
export class BlogController {
  constructor(
    private readonly blogManagementService: BlogManagementService,
    private readonly blogExploreService: BlogExploreService,
  ) { }

  /**
   * GET /blogs - Get list of published blogs (paginated, searchable)
   */
  @Get()
  async getBlogs(
    @Query() query: GetBlogsQueryDto,
  ): Promise<BlogListItemResponseDto[]> {
    const { take, skip, search } = query;
    const finalTake = take ?? 10;
    const finalSkip = skip ?? 0;
    return this.blogExploreService.getBlogs(finalTake, finalSkip, search);
  }

  /**
   * GET /blogs/trending - Get globally trending blogs, optionally filtered by categories
   */
  @Get('trending')
  async getTrendingBlogs(
    @Query() query: GetBlogsQueryDto,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<BlogListItemResponseDto[]> {
    const { take, skip, categories } = query;
    const finalTake = take ?? 10;
    const finalSkip = skip ?? 0;

    return this.blogExploreService.getTrendingBlogs(
      finalTake,
      finalSkip,
      categories,
      user?.id,
    );
  }

  /**
   * GET /blogs/following - Get blogs from followed users, optionally filtered by categories
   */
  @UseGuards(JwtAuthGuard)
  @Get('following')
  async getFollowingBlogs(
    @Query() query: GetBlogsQueryDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<BlogListItemResponseDto[]> {
    const { take, skip, categories } = query;
    const finalTake = take ?? 10;
    const finalSkip = skip ?? 0;

    return this.blogExploreService.getFollowingBlogs(
      user.id,
      finalTake,
      finalSkip,
      categories,
    );
  }

  /**
   * GET /blogs/search - Search blogs by query param 'q'
   */
  @Get('search')
  async searchBlogs(
    @Query('q') searchQuery: string,
    @Query() queryDto: GetBlogsQueryDto,
  ): Promise<BlogListItemResponseDto[]> {
    const { take, skip } = queryDto;
    const finalTake = take ?? 10;
    const finalSkip = skip ?? 0;

    return this.blogExploreService.getBlogs(finalTake, finalSkip, searchQuery);
  }

  /**
   * GET /blogs/me - Get blogs created by the current user
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async findMyBlogs(
    @CurrentUser() user: CurrentUserType,
  ): Promise<BlogListItemResponseDto[]> {
    return this.blogExploreService.findMyBlogs(user.id);
  }

  /**
   * GET /blogs/{id} - Get blog details by ID
   */
  @Get(':id')
  async findBlogById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<BlogDetailsResponseDto> {
    const blog = await this.blogExploreService.findBlogById(id, user?.id);
    if (!blog) {
      throw new NotFoundException(
        `Blog with ID ${id} not found or access denied.`,
      );
    }
    return blog;
  }

  /**
   * POST /blogs - Create a new blog post (Standard REST, replaces /blogs/create)
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBlog(
    @Body() createBlogDto: CreateBlogDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<BlogDetailsResponseDto> {
    return this.blogManagementService.createBlog(createBlogDto, user.id);
  }

  /**
   * PATCH /blogs/{id} - Update an existing blog post
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateBlog(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBlogDto: UpdateBlogDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<BlogDetailsResponseDto> {
    return this.blogManagementService.updateBlog(id, updateBlogDto, user.id);
  }

  /**
   * DELETE /blogs/{id} - Delete a blog post
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteBlog(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserType,
  ): Promise<{ message: string }> {
    await this.blogManagementService.deleteBlog(id, user.id);
    return { message: `Blog with ID ${id} successfully deleted.` };
  }

  /**
   * POST /blogs/{id}/bookmark - Toggle bookmark status for a blog
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  async toggleBookmark(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserType,
  ): Promise<BookmarkResponseDto> {
    return this.blogManagementService.toggleBookmark(id, user.id);
  }

  /**
   * POST /blogs/{id}/protect - Apply protection (details TBD)
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/protect')
  @HttpCode(HttpStatus.OK)
  async protectBlog(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ProtectResponseDto> {
    return this.blogManagementService.protectBlog(id, user.id /*, protectDto? */);
  }

  /**
   * POST /blogs/{id}/rate - Rate a blog
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/rate')
  @HttpCode(HttpStatus.OK)
  async rateBlog(
    @Param('id', ParseIntPipe) id: number,
    @Body() rateBlogDto: RateBlogDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<RatingResponseDto> {
    return this.blogManagementService.rateBlog(id, user.id, rateBlogDto.rating);
  }

  /**
   * GET /blogs/user/:username - Get blogs by username
   */
  @Get('user/:username')
  async getBlogsByUsername(
    @Param('username') username: string,
    @Query() paging: PaginationDto
  ): Promise<BlogListItemResponseDto[]> {
    const { take, skip } = paging;
    return this.blogExploreService.getBlogsByUsername(
      username,
      take,
      skip,
    );
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreatePostDto } from './dto/request/create-post.dto';
import { PostDetailsResponseDto } from './dto/response/post-details.dto';
import { UpdatePostDto } from './dto/request/update-post.dto';
import { ApiBody } from '@nestjs/swagger';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async createPost(
    @Body() createPostDto: CreatePostDto,
  ): Promise<PostDetailsResponseDto> {
    // TODO: will extract from accesstoken
    const userId = 1;
    return this.postsService.createPost(createPostDto, userId);
  }

  @Patch(':post_id')
  async updatePost(
    @Param('post_id') postId: number,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<PostDetailsResponseDto> {
    // TODO: will extract from accesstoken
    const userId = 1;
    return this.postsService.updatePost(Number(postId), updatePostDto, userId);
  }

  @Delete(':post_id')
  async deletePost(@Param('post_id') postId: number) {
    return this.postsService.deletePost(Number(postId));
  }

  @Get('search')
  async searchPosts(
    @Query('q') query: string,
    @Query('page') page: number = 1,
    @Query('page_size') page_size: number = 25,
  ) {
    return this.postsService.searchPosts(query, page, page_size);
  }

  @Get(':post_id')
  async getPostDetails(
    @Param('post_id') postId: number,
  ): Promise<PostDetailsResponseDto> {
    return this.postsService.getPostDetails(Number(postId));
  }

  @Get('for-you')
  async getForYouPosts() {
    // TODO: get user_id from access token
    const userId = 1;
    return this.postsService.getForYouPosts(userId);
  }

  @Get('following')
  async getFollowingPosts() {
    // TODO: get user_id from access token
    const userId = 1;
    return this.postsService.getFollowingPosts(Number(userId));
  }
}

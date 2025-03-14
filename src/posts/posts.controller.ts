import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async createPost(@Body() createPostDto: CreatePostDto) {
    return this.postsService.createPost(createPostDto);
  }

  @Patch(':post_id')
  async updatePost(@Param('post_id') postId: number, @Body() updatePostDto: UpdatePostDto) {
    return this.postsService.updatePost(Number(postId), updatePostDto);
  }

  @Delete(':post_id')
  async deletePost(@Param('post_id') postId: number) {
    return this.postsService.deletePost(Number(postId));
  }

  @Get('trending')
  async getTrendingPosts() {
    return this.postsService.getTrendingPosts();
  }

  @Get('following')
  async getFollowingPosts(@Query('user_id') userId: number, @Query('filter') filter?: string) {
    return this.postsService.getFollowingPosts(Number(userId), filter);
  }
}

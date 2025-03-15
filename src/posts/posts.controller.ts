import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) { }

  @Post()
  @UseInterceptors(FilesInterceptor('images'))
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // will extract from accesstoken
    var userId = 1;
    return this.postsService.createPostWithImages(createPostDto, files, userId);
  }

  @Patch(':post_id')
  @UseInterceptors(FilesInterceptor('images'))
  async updatePost(
    @Param('post_id') postId: number,
    @Body() updatePostDto: UpdatePostDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {

    // will extract from accesstoken
    var userId = 1;
    return this.postsService.updatePost(Number(postId), updatePostDto, files, userId);
  }

  @Delete(':post_id')
  async deletePost(@Param('post_id') postId: number) {
    return this.postsService.deletePost(Number(postId));
  }

  @Get(':post_id')
  async getPostDetails(@Param('post_id') postId: number) {
    return this.postsService.getPostDetails(Number(postId));
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

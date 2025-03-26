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
  UseInterceptors,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/request/create-post.dto';
import { PostDetailsResponseDto } from './dto/response/post-details.dto';
import { UpdatePostDto } from './dto/request/update-post.dto';
import { PostListItemResponseDto } from './dto/response/post-list-item.dto';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images'))
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @UploadedFiles() images: Express.Multer.File[],
  ): Promise<any> {
    // TODO: will extract from accesstoken
    const userId = 2;
    return this.postsService.createPost(createPostDto, images, userId);
  }

  @Patch(':post_id')
  @UseInterceptors(FilesInterceptor('images'))
  async updatePost(
    @Param('post_id') postId: number,
    @Body() updatePostDto: UpdatePostDto,
    @UploadedFiles() images: Express.Multer.File[],
  ): Promise<PostDetailsResponseDto> {
    // TODO: will extract from accesstoken
    const userId = 1;
    return this.postsService.updatePost(Number(postId), updatePostDto, images, userId);
  }

  @Delete(':post_id')
  async deletePost(@Param('post_id') postId: number) {
    return this.postsService.deletePost(Number(postId));
  }

  @Get('search')
  async searchPosts(
    @Query('q') query: string,
    @Query('page') page: string = '1', // using string here because somehow default value is not working with number
    @Query('page_size') page_size: string = '25',
  ): Promise<PostListItemResponseDto[]> {
    return this.postsService.searchPosts(query, Number(page), Number(page_size));
  }

  @Get('for-you')
  async getForYouPosts(
    @Query('page') page: string = '1',
    @Query('page_size') page_size: string = '25',
  ) {
    // TODO: get user_id from access token
    const userId = 1;
    return this.postsService.getForYouPosts(userId, Number(page), Number(page_size));
  }

  @Get('following')
  async getFollowingPosts(
    @Query('page') page: string = '1',
    @Query('page_size') page_size: string = '25',
  ): Promise<PostListItemResponseDto[]> {
    // TODO: get user_id from access token
    const userId = 1;
  
    return this.postsService.getFollowingPosts(userId, Number(page), Number(page_size));
  }

  @Get(':post_id')
  async getPostDetails(
    @Param('post_id') postId: number,
  ): Promise<PostDetailsResponseDto> {
    return this.postsService.getPostDetails(Number(postId));
  }
}

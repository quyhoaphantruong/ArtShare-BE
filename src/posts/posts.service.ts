import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreatePostDto, UpdatePostDto } from './dto/post-request.dto';
import { CreatePostResponseDto, PostDetailsResponseDto, UpdatePostResponseDto } from './dto/post-response.dto';
import { plainToInstance } from 'class-transformer';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) { }
  
  async createPost(
    createPostDto: CreatePostDto,
    userId: number
  ): Promise<CreatePostResponseDto> {
    console.log('createPostDto', createPostDto);
  
    const { cate_ids, medias_data, ...postData } = createPostDto;
  
    // Create post with provided metadata
    const post = await this.prisma.post.create({
      data: {
        user_id: userId,
        ...postData,
        medias: {
          create: medias_data.map(({ url, media_type }) => ({
            media_type,
            url,
            creator_id: userId,
          })),
        },
        categories: {
          connect: (cate_ids || []).map((cate_id) => ({ cate_id })),
        },
      },
      include: { medias: true, user: true, categories: true },
    });
  
    return plainToInstance(CreatePostResponseDto, post);
  }

  async updatePost(
    postId: number,
    updatePostDto: UpdatePostDto,
    userId: number
  ) {
    // Check if the post exists
    const existingPost = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { medias: true }, // Fetch existing media
    });
  
    if (!existingPost) {
      throw new NotFoundException('Post not found');
    }
  
    const { cate_ids, medias_data, ...postData } = updatePostDto;
  
    // Determine if media needs to be updated
    const newMediaProvided = medias_data && medias_data.length > 0;
    
    // If new media is provided, delete existing media
    if (newMediaProvided) {
      await this.prisma.media.deleteMany({ where: { post_id: postId } });
    }
  
    // Update the post.
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        ...postData,
        categories: {
          set: (cate_ids || []).map((cate_id) => ({ cate_id })),
        },
        ...(newMediaProvided && {
          medias: {
            create: medias_data.map(({ url, media_type }) => ({
              media_type,
              url,
              creator_id: userId,
            })),
          },
        }),
      },
      include: { medias: true, user: true, categories: true },
    });
  
    return plainToInstance(UpdatePostResponseDto, updatedPost);
  }
  
  

  async deletePost(postId: number) {
    // Retrieve the post along with its associated media records
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { medias: true },
    });
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }
  
    // Delete each file from S3
    if (post.medias && post.medias.length > 0) {
      await Promise.all(
        post.medias.map((media) => this.storageService.deleteFile(media.url))
      );
    }
  
    // Delete the post from the database
    return this.prisma.post.delete({ where: { id: postId } });
  }
  

  async getForYouPosts(userId: number) {
    return this.prisma.post.findMany({
      where: { is_published: true },
      orderBy: { share_count: 'desc' }, // Assuming trending is based on shares
      take: 10,
      include: {
        medias: true, // Fetch associated media for each post
      },
    });
  }

  async getPostDetails(postId: number): Promise<PostDetailsResponseDto> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { medias: true, user: true, categories: true },
    });
  
    if (!post) {
      throw new NotFoundException('Post not found');
    }
  
    return plainToInstance(PostDetailsResponseDto, post);
  }

  async getFollowingPosts(userId: number, filter?: string) {
    return this.prisma.post.findMany({
      where: {
        is_published: true,
        user: { id: userId }, // Fetch posts from followed users (modify this logic based on actual follow structure)
      },
      orderBy: { created_at: 'desc' },
      include: {
        medias: true,
      },
      take: 10,
    });
  }
}

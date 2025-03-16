import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreatePostDto, UpdatePostDto } from './dto/post-request.dto';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import { MediaType } from '@prisma/client';
import { S3Service } from 'src/s3/s3.service';
import { CreatePostResponseDto, PostDetailsResponseDto, UpdatePostResponseDto } from './dto/post-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service, // Inject S3Service
  ) { }
  
  async createPost(
    createPostDto: CreatePostDto,
    medias: Express.Multer.File[],
    userId: number
  ): Promise<CreatePostResponseDto> {
    console.log('createPostDto', createPostDto);
    const mediaData = await this.s3Service.uploadFiles(medias);

    const { cate_ids, ...postData } = createPostDto;
  
    const post = await this.prisma.post.create({
      data: {
        user_id: userId,
        ...postData,
        medias: {
          create: mediaData.map(({ url, media_type }) => ({
            media_type,
            url,
            creator_id: userId,
          })),
        },
        categories: {
          connect: cate_ids.map((cate_id) => ({ cate_id })),
        },
      },
      include: { medias: true, user: true, categories: true },
    });
  
    return plainToInstance(CreatePostResponseDto, post, { excludeExtraneousValues: true });
  }

  async updatePost(
    postId: number,
    updatePostDto: UpdatePostDto,
    medias: Express.Multer.File[],
    userId: number,
  ) {
    // Check if the post exists
    const existingPost = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!existingPost) {
      throw new NotFoundException('Post not found');
    }
  
    // if files are provided, upload them and prepare new media records
    const newFilesProvided = medias && medias.length > 0;
    let additionalMediaData = undefined;
    if (newFilesProvided) {
      const mediaData = await this.s3Service.uploadFiles(medias);
      additionalMediaData = mediaData.map(({ url, media_type }) => ({
        media_type,
        url,
        creator_id: userId,
      }));
    }
  
    // delete existing media
    if (newFilesProvided) {
      await this.prisma.media.deleteMany({ where: { post_id: postId } });
    }

    const { cate_ids, ...postData } = updatePostDto;
  
    // update the post.
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        ...postData,
        categories: {
          set: cate_ids.map((cate_id) => ({ cate_id })),
        },
        ...(newFilesProvided && {
          medias: {
            create: additionalMediaData,
          },
        }),
      },
      include: { medias: true, user: true, categories: true },
    });
  
    return plainToInstance(UpdatePostResponseDto, updatedPost, { excludeExtraneousValues: true });
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
        post.medias.map((media) => this.s3Service.deleteFileByUrl(media.url))
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

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import { MediaType } from '@prisma/client';
import { S3Service } from 'src/s3/s3.service';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service, // Inject S3Service
  ) {}
  async createPostWithImages(createPostDto: CreatePostDto, files: Express.Multer.File[], userId: number) {
  
    const mediaData = await this.s3Service.uploadFiles(files);
  
    const post = await this.prisma.post.create({
      data: {
        user_id: userId,
        title: createPostDto.title,
        description: createPostDto.description,
        is_published: createPostDto.is_published,
        medias: {
          create: mediaData.map(({ url, media_type }) => ({
            media_type,
            url,
            creator_id: userId,
          })),
        },
      },
      select: { id: true, title: true, description: true, medias: true },
    });
  
    return post;
  }

  async updatePost(
    postId: number,
    updatePostDto: UpdatePostDto,
    files: Express.Multer.File[],
    userId: number,
  ) {
    // Check if the post exists
    const existingPost = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!existingPost) {
      throw new NotFoundException('Post not found');
    }
  
    // if files are provided, upload them and prepare new media records
    let additionalMediaData = undefined;
    if (files && files.length > 0) {
      const mediaData = await this.s3Service.uploadFiles(files);
      additionalMediaData = mediaData.map(({ url, media_type }) => ({
        media_type,
        url,
        creator_id: userId,
      }));
    }
  
    // delete existing media first.
    if (additionalMediaData && additionalMediaData.length > 0) {
      await this.prisma.media.deleteMany({ where: { post_id: postId } });
    }
  
    // Update the post.
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        ...updatePostDto,
        // Only add medias if new media records are available
        ...(additionalMediaData && additionalMediaData.length > 0 && {
          medias: {
            create: additionalMediaData,
          },
        }),
      },
      select: { id: true, title: true, description: true, medias: true },
    });
  
    return updatedPost;
  }
  

  async deletePost(postId: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    return this.prisma.post.delete({ where: { id: postId } });
  }

  async getTrendingPosts() {
    return this.prisma.post.findMany({
      where: { is_published: true },
      orderBy: { share_count: 'desc' }, // Assuming trending is based on shares
      take: 10,
      include: {
        medias: true, // Fetch associated media for each post
      },
    });
  }

  async getPostDetails(postId: number) {
    return this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        medias: true, // Fetch associated media for the post
      },
    });
  }

  async getFollowingPosts(userId: number, filter?: string) {
    return this.prisma.post.findMany({
      where: {
        is_published: true,
        user: { id: userId }, // Fetch posts from followed users (modify this logic based on actual follow structure)
      },
      orderBy: { created_at: 'desc' },
      include: {
        medias: true, // Fetch associated media for each post
      },
      take: 10,
    });
  }
}

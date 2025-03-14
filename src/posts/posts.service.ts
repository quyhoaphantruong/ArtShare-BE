import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async createPost(data: CreatePostDto) {
    return this.prisma.post.create({ data });
  }

  async updatePost(postId: number, data: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    return this.prisma.post.update({
      where: { id: postId },
      data,
    });
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
    });
  }

  async getFollowingPosts(userId: number, filter?: string) {
    return this.prisma.post.findMany({
      where: {
        is_published: true,
        user: { id: userId }, // Fetch posts from followed users (modify this logic based on actual follow structure)
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });
  }
}

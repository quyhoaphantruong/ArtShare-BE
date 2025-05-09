import { Injectable, NotFoundException } from '@nestjs/common';
import { PostListItemResponseDto } from './dto/response/post-list-item.dto';
import { plainToInstance } from 'class-transformer';
import { TryCatch } from 'src/common/try-catch.decorator';
import { PrismaService } from 'src/prisma.service';
import { Post, Prisma } from '@prisma/client';
import { EmbeddingService } from 'src/embedding/embedding.service';
import { QdrantClient } from '@qdrant/js-client-rest';
import { PostDetailsResponseDto } from './dto/response/post-details.dto';
import { SearchPostDto } from './dto/request/search-post.dto';

type PostDetails = Prisma.PostGetPayload<{
  include: { categories: true; user: true; medias: true };
}>;

@Injectable()
export class PostsExploreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly qdrantClient: QdrantClient,
  ) {}

  private readonly qdrantCollectionName = 'posts';

  @TryCatch()
  async getForYouPosts(
    userId: string,
    page: number,
    page_size: number,
    filter: string[],
  ): Promise<PostListItemResponseDto[]> {
    const skip = (page - 1) * page_size;

    const whereClause =
      filter && filter.length > 0
        ? { categories: { some: { name: { in: filter } } } }
        : {};

    const posts = await this.prisma.post.findMany({
      where: whereClause,
      orderBy: { share_count: 'desc' },
      take: page_size,
      skip,
      include: {
        medias: true,
        user: true,
        categories: true,
      },
    });

    return plainToInstance(PostListItemResponseDto, posts);
  }

  async getFollowingPosts(
    userId: string,
    page: number,
    page_size: number,
    filter: string[],
  ): Promise<PostListItemResponseDto[]> {
    const followingUsers = await this.prisma.follow.findMany({
      where: { follower_id: userId },
      select: { following_id: true },
    });

    const followingIds = followingUsers.map((follow) => follow.following_id);

    const skip = (page - 1) * page_size;

    const whereClause = {
      user_id: { in: followingIds },
      ...(filter &&
        filter.length > 0 && {
          categories: { some: { name: { in: filter } } },
        }),
    };

    const posts = await this.prisma.post.findMany({
      where: whereClause,
      skip,
      take: page_size,
      include: {
        medias: true,
        user: true,
        categories: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return plainToInstance(PostListItemResponseDto, posts);
  }

  @TryCatch()
  async getPostDetails(postId: number): Promise<PostDetailsResponseDto> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { medias: true, user: true, categories: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // update the view count
    await this.prisma.post.update({
      where: { id: postId },
      data: { view_count: { increment: 1 } },
    });
    return plainToInstance(PostDetailsResponseDto, post);
  }

  @TryCatch()
  async findPostsByUsername(
    username: string,
    page: number,
    page_size: number,
  ): Promise<PostListItemResponseDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { username: username },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const skip = (page - 1) * page_size;

    const posts = await this.prisma.post.findMany({
      where: { user_id: user.id },
      skip,
      take: page_size,
      include: {
        medias: true,
        user: true,
        categories: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return plainToInstance(PostListItemResponseDto, posts);
  }

  @TryCatch()
  async searchPosts(body: SearchPostDto): Promise<PostListItemResponseDto[]> {
    const { q, page = 1, page_size = 25, filter } = body;

    const queryEmbedding =
      await this.embeddingService.generateEmbeddingFromText(q);
    const searchResponse = await this.qdrantClient.query(
      this.qdrantCollectionName,
      {
        prefetch: [
          {
            query: queryEmbedding,
            using: 'images',
          },
          {
            query: queryEmbedding,
            using: 'description',
          },
          {
            query: queryEmbedding,
            using: 'title',
          },
        ],
        query: {
          fusion: 'dbsf',
        },
        offset: (page - 1) * page_size,
        limit: page_size,
        // with_payload: true,
      },
    );

    const pointIds: number[] = searchResponse.points
      .map((point) => Number(point.id))
      .filter((pointId) => !isNaN(pointId))

    const posts: PostDetails[] = await this.prisma.post.findMany({
      where: { id: { in: pointIds } },
      include: { medias: true, user: true, categories: true },
    });

    // Sort posts in the same order as returned by Qdrant
    let sortedPosts: PostDetails[] = pointIds
      .map((id) => posts.find((post: PostDetails) => post.id === id))
      .filter((post): post is PostDetails => post !== undefined);

    if (filter && filter.length > 0) {
      sortedPosts = sortedPosts.filter((post) =>
        post.categories.some((category) => filter.includes(category.name)),
      );
    }
    return plainToInstance(PostListItemResponseDto, sortedPosts);
  }

  @TryCatch()
  async getRelevantPosts(
    postId: number,
    page: number,
    page_size: number,
  ): Promise<PostListItemResponseDto[]> {
    const post: Post | null = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const relevantQueryText = post.title + ' ' + post.description;
    const queryEmbedding =
      await this.embeddingService.generateEmbeddingFromText(relevantQueryText);

    const searchResponse = await this.qdrantClient.query(
      this.qdrantCollectionName,
      {
        prefetch: [
          {
            query: queryEmbedding,
            using: 'images',
          },
          {
            query: queryEmbedding,
            using: 'description',
          },
          {
            query: queryEmbedding,
            using: 'title',
          },
        ],
        query: {
          fusion: 'dbsf',
        },
        offset: (page - 1) * page_size,
        limit: page_size,
      },
    );

    const pointIds: number[] = searchResponse.points
      .map((point) => Number(point.id))
      .filter((pointId) => !isNaN(pointId))
      .filter((pointId) => pointId !== postId);

    const posts: Post[] = await this.prisma.post.findMany({
      where: { id: { in: pointIds } },
    });

    const sortedPosts = pointIds
      .map((id) => posts.find((post) => post.id === id))
      .filter((post) => post !== undefined);

    return plainToInstance(PostListItemResponseDto, sortedPosts);
  }
}

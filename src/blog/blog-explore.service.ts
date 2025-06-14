import { Prisma } from '@prisma/client';
import { BlogListItemResponseDto } from './dto/response/blog-list-item.dto';
import { PrismaService } from 'src/prisma.service';
import { EmbeddingService } from 'src/embedding/embedding.service';
import { QdrantClient } from '@qdrant/js-client-rest';
import {
  BlogForListItemPayload,
  blogListItemSelect,
  mapBlogToDetailsDto,
  mapBlogToListItemDto,
} from './helpers/blog-mapping.helper';
import { BlogDetailsResponseDto } from './dto/response/blog-details.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { TryCatch } from 'src/common/try-catch.decorator';

@Injectable()
export class BlogExploreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly qdrantClient: QdrantClient,
  ) {}

  private readonly qdrantCollectionName = 'blogs';

  private async applyCommonBlogFilters(
    baseWhere: Prisma.BlogWhereInput,
    requestingUserId?: string | null,
    categories?: string[] | null,
  ): Promise<Prisma.BlogWhereInput> {
    const whereClause = { ...baseWhere };

    if (categories && categories.length > 0) {
      whereClause.categories = {
        some: {
          name: {
            in: categories,
            mode: 'insensitive',
          },
        },
      };
    }

    return whereClause;
  }

  @TryCatch()
  async getBlogs(
    take: number,
    skip: number,
    search?: string,
  ): Promise<BlogListItemResponseDto[]> {
    const whereClause: Prisma.BlogWhereInput = {
      is_published: true,
      is_protected: false,
    };

    if (search) {
      // whereClause.OR = [
      //   { title: { contains: search, mode: 'insensitive' } },
      //   { content: { contains: search, mode: 'insensitive' } },
      // ];

      return this.getBlogsByQueryEmbedding(search, take, skip);
    }

    const blogs: BlogForListItemPayload[] = await this.prisma.blog.findMany({
      where: whereClause,
      select: blogListItemSelect,
      orderBy: [{ created_at: 'desc' }],
      take: take,
      skip: skip,
    });

    return blogs
      .map(mapBlogToListItemDto)
      .filter((b): b is BlogListItemResponseDto => b !== null);
  }

  async findMyBlogs(userId: string): Promise<BlogListItemResponseDto[]> {
    const blogs: BlogForListItemPayload[] = await this.prisma.blog.findMany({
      where: { user_id: userId },
      select: blogListItemSelect,
      orderBy: { created_at: 'desc' },
    });
    return blogs
      .map(mapBlogToListItemDto)
      .filter((b): b is BlogListItemResponseDto => b !== null);
  }

  async findBlogById(
    id: number,
    requestingUserId?: string | null,
  ): Promise<BlogDetailsResponseDto | null> {
    // Single query that gets all needed data for both existence and access checks
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile_picture_url: true,
            full_name: true,
            followers_count: true,
          },
        },
        likes: {
          where: { user_id: requestingUserId ?? '' },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!blog) {
      return null; // Blog doesn't exist
    }

    const isOwner = blog.user_id === requestingUserId;

    // Apply access control rules using the same blog object
    if (!blog.is_published && !isOwner) {
      return null; // Unpublished blog, not accessible to non-owners
    }

    if (blog.is_protected && !isOwner) {
      return null; // Protected blog, not accessible to non-owners
    }

    // Increment view count for accessible blogs
    await this.prisma.blog.update({
      where: { id },
      data: { view_count: { increment: 1 } },
    });

    return mapBlogToDetailsDto(blog);
  }
  async checkBlogAccess(
    id: number,
    requestingUserId?: string | null,
  ): Promise<{
    exists: boolean;
    accessible: boolean;
    reason?: 'not_found' | 'not_published' | 'protected';
    isOwner?: boolean;
  }> {
    // Use select instead of include for minimal data fetch
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      select: {
        id: true,
        is_published: true,
        is_protected: true,
        user_id: true,
      },
    });

    if (!blog) {
      return { exists: false, accessible: false, reason: 'not_found' };
    }

    const isOwner = blog.user_id === requestingUserId;

    if (!blog.is_published && !isOwner) {
      return {
        exists: true,
        accessible: false,
        reason: 'not_published',
        isOwner,
      };
    }

    if (blog.is_protected && !isOwner) {
      return {
        exists: true,
        accessible: false,
        reason: 'protected',
        isOwner,
      };
    }

    return { exists: true, accessible: true, isOwner };
  }

  async getTrendingBlogs(
    take: number,
    skip: number,
    categories?: string[],
    requestingUserId?: string | null,
  ): Promise<BlogListItemResponseDto[]> {
    const baseWhere: Prisma.BlogWhereInput = {
      is_published: true,
      is_protected: false,
    };

    const finalWhere = await this.applyCommonBlogFilters(
      baseWhere,
      requestingUserId,
      categories,
    );

    const blogs: BlogForListItemPayload[] = await this.prisma.blog.findMany({
      where: finalWhere,
      select: blogListItemSelect,
      orderBy: [
        { like_count: 'desc' },
        { comment_count: 'desc' },
        { created_at: 'desc' },
      ],
      take: take,
      skip: skip,
    });
    return blogs
      .map(mapBlogToListItemDto)
      .filter((b): b is BlogListItemResponseDto => b !== null);
  }

  async getFollowingBlogs(
    userId: string,
    take: number,
    skip: number,
    categories?: string[],
  ): Promise<BlogListItemResponseDto[]> {
    const followedUsers = await this.prisma.follow.findMany({
      where: { follower_id: userId },
      select: { following_id: true },
    });
    const followedUserIds = followedUsers.map((f) => f.following_id);

    if (followedUserIds.length === 0) return [];

    const baseWhere: Prisma.BlogWhereInput = {
      user_id: { in: followedUserIds },
      is_published: true,
      is_protected: false,
    };

    const finalWhere = await this.applyCommonBlogFilters(
      baseWhere,
      null,
      categories,
    );

    const blogs: BlogForListItemPayload[] = await this.prisma.blog.findMany({
      where: finalWhere,
      select: blogListItemSelect,
      orderBy: { created_at: 'desc' },
      take: take,
      skip: skip,
    });
    return blogs
      .map(mapBlogToListItemDto)
      .filter((b): b is BlogListItemResponseDto => b !== null);
  }

  async getBlogsByUsername(
    username: string,
    take: number,
    skip: number,
  ): Promise<BlogListItemResponseDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found.`);
    }

    const blogs: BlogForListItemPayload[] = await this.prisma.blog.findMany({
      where: { user_id: user.id },
      select: blogListItemSelect,
      orderBy: { created_at: 'desc' },
      take: take,
      skip: skip,
    });

    return blogs
      .map(mapBlogToListItemDto)
      .filter((b): b is BlogListItemResponseDto => b !== null);
  }

  @TryCatch()
  async getRelevantBlogs(
    blogId: number,
    take: number,
    skip: number,
  ): Promise<BlogListItemResponseDto[]> {
    const blog = await this.prisma.blog.findUnique({
      where: { id: blogId },
    });
    if (!blog) {
      throw new NotFoundException(`Blog with ID ${blogId} not found.`);
    }

    const relevantQueryText = blog.title + ' ' + blog.content;
    
    // MODIFICATION 1: Pass the blogId to be excluded down to the next function.
    return await this.getBlogsByQueryEmbedding(relevantQueryText, take, skip, blogId);
  }

  private async getBlogsByQueryEmbedding(
  searchQuery: string,
  take: number,
  skip: number,
  excludeId?: number, 
): Promise<BlogListItemResponseDto[]> {
  const queryEmbedding =
    await this.embeddingService.generateEmbeddingFromText(searchQuery);
    
  const searchResponse = await this.qdrantClient.query(
    this.qdrantCollectionName,
    {
      prefetch: [
        {
          query: queryEmbedding,
          using: 'title',
        },
        {
          query: queryEmbedding,
          using: 'content',
        },
      ],
      query: {
        fusion: 'dbsf',
      },
      
      // Only add filter if excludeId is provided
      ...(excludeId && {
        filter: {
          must_not: [
            {
              has_id: [excludeId], 
            },
          ],
        },
      }),
      
      offset: skip,
      limit: take,
    },
  );

  const pointIds: number[] = searchResponse.points.map((point) =>
    Number(point.id),
  );

  const blogs: BlogForListItemPayload[] = await this.prisma.blog.findMany({
    where: { id: { in: pointIds } },
    select: blogListItemSelect,
  });

  const sortedBlogs: BlogForListItemPayload[] = pointIds
    .map((id) => blogs.find((blog) => blog.id === id))
    .filter((blog) => blog !== undefined);

  return sortedBlogs
    .map(mapBlogToListItemDto)
    .filter((b): b is BlogListItemResponseDto => b !== null);
}

}

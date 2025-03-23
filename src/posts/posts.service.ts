import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { plainToInstance } from 'class-transformer';
import { StorageService } from 'src/storage/storage.service';
import { EmbeddingService } from 'src/embedding/embedding.service';
import { Media, Post } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client-rest';
import { TryCatch } from 'src/common/try-catch.decorator.';
import { CreatePostDto } from './dto/request/create-post.dto';
import { PostDetailsResponseDto } from './dto/response/post-details.dto';
import { UpdatePostDto } from './dto/request/update-post.dto';

class VectorParams {
  title?: number[];
  description?: number[];
  images?: number[][];
}

@Injectable()
export class PostsService {
  private readonly qdrantCollectionName = 'posts';
  private readonly qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    port: 6333,
    apiKey: process.env.QDRANT_API_KEY,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  @TryCatch()
  async createPost(
    createPostDto: CreatePostDto,
    userId: number,
  ): Promise<PostDetailsResponseDto> {
    const { cate_ids, medias_data, ...postData } = createPostDto;

    const post = await this.prisma.post.create({
      data: {
        user_id: userId,
        ...postData,
        thumbnail_url: medias_data[0].url,
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

    await this.savePostEmbedding(post);
    return plainToInstance(PostDetailsResponseDto, post);
  }

  async updatePost(
    postId: number,
    updatePostDto: UpdatePostDto,
    userId: number,
  ): Promise<PostDetailsResponseDto> {
    const existingPost = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { medias: true },
    });

    if (!existingPost) {
      throw new NotFoundException('Post not found');
    }

    const { cate_ids, medias_data, ...postData } = updatePostDto;
    const newMediaProvided = medias_data && medias_data.length > 0;

    if (newMediaProvided) {
      const deleteResponse = await this.prisma.media.deleteMany({
        where: { post_id: postId },
      });
      this.updatePostEmbedding(existingPost);
    }

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

    return plainToInstance(PostDetailsResponseDto, updatedPost);
  }

  async deletePost(postId: number): Promise<Post> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { medias: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.medias && post.medias.length > 0) {
      await Promise.all(
        post.medias.map((media) => this.storageService.deleteFile(media.url)),
      );
    }

    return this.prisma.post.delete({ where: { id: postId } });
  }

  async getForYouPosts(userId: number): Promise<Post[]> {
    return this.prisma.post.findMany({
      where: { is_published: true },
      orderBy: { share_count: 'desc' },
      take: 10,
      include: { medias: true },
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

  async getFollowingPosts(userId: number, filter?: string): Promise<Post[]> {
    // Note: This is a placeholder. You may want to adjust the query to fetch posts from followed users.
    return this.prisma.post.findMany({
      where: {
        is_published: true,
        user: { id: userId },
      },
      orderBy: { created_at: 'desc' },
      include: { medias: true },
      take: 10,
    });
  }

  @TryCatch()
  async searchPosts(
    query: string,
    page: number,
    page_size: number,
  ): Promise<(Post | undefined)[]> {
    console.log('page:', page, 'page_size:', page_size);
    const queryEmbedding =
      await this.embeddingService.generateEmbeddingFromText(query);
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

    const pointIds: number[] = searchResponse.points.map((point) =>
      Number(point.id),
    );

    const posts = await this.prisma.post.findMany({
      where: { id: { in: pointIds } },
      include: { medias: true, user: true, categories: true },
    });

    // Sort posts in the same order as returned by Qdrant
    const sortedPosts = pointIds.map((id) =>
      posts.find((post) => post.id === id),
    );
    return sortedPosts;
  }

  private async getVectorParams(
    post: Post & { medias: Media[] },
  ): Promise<VectorParams> {
    const [titleEmbedding, descriptionEmbedding, imageEmbeddings] =
      await Promise.all([
        post.title
          ? this.embeddingService.generateEmbeddingFromText(post.title)
          : undefined,
        post.description
          ? this.embeddingService.generateEmbeddingFromText(post.description)
          : undefined,
        post.medias && post.medias.length > 0
          ? Promise.all(
              post.medias.map((media) =>
                this.embeddingService.generateEmbeddingFromImage(media.url),
              ),
            )
          : undefined,
      ]);

    return {
      title: titleEmbedding,
      description: descriptionEmbedding,
      images: imageEmbeddings,
    };
  }

  @TryCatch()
  private async savePostEmbedding(
    post: Post & { medias: Media[] },
  ): Promise<void> {
    const { title, description, images } = await this.getVectorParams(post);

    const operationInfo = await this.qdrantClient.upsert(
      this.qdrantCollectionName,
      {
        wait: true,
        points: [
          {
            id: post.id,
            vector: {
              title: title,
              description: description,
              images: images,
            },
            payload: { postId: post.id },
          },
        ],
      },
    );

    console.log('Upsert operation info:', operationInfo);
  }

  @TryCatch()
  private async updatePostEmbedding(
    post: Post & { medias: Media[] },
  ): Promise<void> {
    const { title, description, images }: VectorParams =
      await this.getVectorParams(post);

    const operationInfo = await this.qdrantClient.updateVectors(
      this.qdrantCollectionName,
      {
        points: [
          {
            id: post.id,
            vector: {
              title: title,
              description: description,
              images: images,
            },
          },
        ],
      },
    );

    console.log('Update operation info:', operationInfo);
  }
}

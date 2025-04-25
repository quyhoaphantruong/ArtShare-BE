import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { plainToInstance } from 'class-transformer';
import { StorageService } from 'src/storage/storage.service';
import { EmbeddingService } from 'src/embedding/embedding.service';
import { MediaType, Post } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client-rest';
import { TryCatch } from 'src/common/try-catch.decorator';
import { CreatePostDto } from './dto/request/create-post.dto';
import { PostDetailsResponseDto } from './dto/response/post-details.dto';
import { UpdatePostDto } from './dto/request/update-post.dto';
import { PostListItemResponseDto } from './dto/response/post-list-item.dto';
import { FileUploadResponse } from 'src/storage/dto/response.dto';
import { randomUUID } from 'crypto';

class VectorParams {
  titleEmbedding?: number[];
  descriptionEmbdding?: number[];
  imagesEmbedding?: number[][];
}

export class MediaData {
  url: string;
  media_type: MediaType;
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

  private async ensureQdrantCollectionExists() {
    const collections = await this.qdrantClient.getCollections();
    const exists = collections.collections.some(
      (col) => col.name === this.qdrantCollectionName,
    );

    if (!exists) {
      await this.qdrantClient.createCollection(this.qdrantCollectionName, {
        vectors: {
          title: { size: 512, distance: 'Cosine' },
          description: { size: 512, distance: 'Cosine' },
          images: { size: 512, distance: 'Cosine' },
        },
      });

      console.log(
        `Created Qdrant collection '${this.qdrantCollectionName}' with named vectors`,
      );
    }
  }

  @TryCatch()
  async createPost(
    createPostDto: CreatePostDto,
    images: Express.Multer.File[],
    userId: string,
  ): Promise<PostDetailsResponseDto> {
    const { cate_ids, video_url, thumbnail_url, ...createPostData } =
      createPostDto;

    const imageUploads: FileUploadResponse[] =
      await this.storageService.uploadFiles(images, 'posts');

    const mediasData = [
      ...(video_url ? [{ url: video_url, media_type: MediaType.video }] : []),
      ...imageUploads.map(({ url }) => ({ url, media_type: MediaType.image })),
    ];
    const post = await this.prisma.post.create({
      data: {
        user_id: userId,
        ...createPostData,
        thumbnail_url: thumbnail_url || imageUploads[0]?.url || '', // Set thumbnail_url to the first image
        medias: {
          create: mediasData.map(({ url, media_type }) => ({
            media_type,
            url,
            creator_id: userId,
          })),
        },
        categories: {
          connect: (cate_ids || []).map((cate_id) => ({ id: cate_id })),
        },
      },
      include: { medias: true, user: true, categories: true },
    });

    await this.ensureQdrantCollectionExists();

    await this.savePostEmbedding(
      post.id,
      createPostData.title,
      createPostData.description,
      images,
    );

    return plainToInstance(PostDetailsResponseDto, post);
  }

  @TryCatch()
  async updatePost(
    postId: number,
    updatePostDto: UpdatePostDto,
    images: Express.Multer.File[],
    userId: string,
  ): Promise<PostDetailsResponseDto> {
    const existingPost = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { medias: true },
    });

    if (!existingPost) {
      throw new NotFoundException('Post not found');
    }

    const {
      cate_ids,
      video_url,
      existing_image_urls = [],
      ...postUpdateData
    } = updatePostDto;

    const existingImageUrlsSet = new Set(existing_image_urls);

    /** ────────────── HANDLE IMAGE DELETION ────────────── */
    const existingImages = existingPost.medias.filter(
      (m) => m.media_type === MediaType.image,
    );

    const imagesToDelete = existingImages.filter(
      (m) => !existingImageUrlsSet.has(m.url),
    );
    console.log('imagesToDelete', imagesToDelete);
    console.log('existing images', existingImages);

    if (imagesToDelete.length > 0) {
      await Promise.all([
        this.prisma.media.deleteMany({
          where: {
            id: { in: imagesToDelete.map((m) => m.id) },
          },
        }),
        this.storageService.deleteFiles(imagesToDelete.map((m) => m.url)),
      ]);
    }

    /** ────────────── HANDLE NEW IMAGE UPLOADS ────────────── */
    let newImageUploads: FileUploadResponse[] = [];
    if (images && images.length > 0) {
      newImageUploads = await this.storageService.uploadFiles(images, 'posts');
    }

    /** ────────────── HANDLE VIDEO UPDATE ────────────── */
    /* 1️⃣ normalise the raw value coming from the DTO */
    const videoUrl = (video_url ?? '').trim(); // '' when user deletes
    const existingVideo = existingPost.medias.find(
      (m) => m.media_type === MediaType.video,
    );

    /* 2️⃣ decide what the user wants to do */
    const wantsDeletion = existingVideo && videoUrl === '';
    const wantsReplace =
      existingVideo && videoUrl && videoUrl !== existingVideo.url;
    const wantsNewUpload = !existingVideo && videoUrl; // first‑time video

    /* 3️⃣ delete the old video row + file only when needed */
    if (wantsDeletion || wantsReplace) {
      await Promise.all([
        this.prisma.media.delete({ where: { id: existingVideo.id } }),
        this.storageService.deleteFiles([existingVideo.url]),
      ]);
    }

    /** ────────────── COMBINE NEW MEDIA ────────────── */
    const mediasData: MediaData[] = [
      ...(wantsReplace || wantsNewUpload
        ? [{ url: videoUrl, media_type: MediaType.video }]
        : []),
      ...newImageUploads.map(({ url }) => ({
        url,
        media_type: MediaType.image,
      })),
    ];

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        ...postUpdateData,
        categories: {
          set: (cate_ids || []).map((id) => ({ id })),
        },
        ...(mediasData.length > 0 && {
          medias: {
            create: mediasData.map(({ url, media_type }) => ({
              media_type,
              url,
              creator_id: userId,
            })),
          },
        }),
      },
      include: { medias: true, user: true, categories: true },
    });

    this.updatePostEmbedding(
      postId,
      postUpdateData.title,
      postUpdateData.description,
      images,
    );

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
        post.medias.map((media) =>
          this.storageService.deleteFiles([media.url]),
        ),
      );
    }

    return this.prisma.post.delete({ where: { id: postId } });
  }

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
    return plainToInstance(PostDetailsResponseDto, post);
  }

  @TryCatch()
  async searchPosts(
    query: string,
    page: number,
    page_size: number,
  ): Promise<PostListItemResponseDto[]> {
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
    const sortedPosts: Post[] = pointIds
      .map((id) => posts.find((post) => post.id === id))
      .filter((post) => post !== undefined);
    return plainToInstance(PostListItemResponseDto, sortedPosts);
  }

  private async getVectorParams(
    title: string | undefined,
    description: string | undefined,
    imageFiles: Express.Multer.File[],
  ): Promise<VectorParams> {
    const [titleEmbedding, descriptionEmbedding, imageEmbeddings] =
      await Promise.all([
        title
          ? this.embeddingService.generateEmbeddingFromText(title)
          : undefined,
        description
          ? this.embeddingService.generateEmbeddingFromText(description)
          : undefined,
        imageFiles && imageFiles.length > 0
          ? Promise.all(
              imageFiles.map((image) =>
                this.embeddingService.generateEmbeddingFromImageBlob(
                  new Blob([image.buffer]),
                ),
              ),
            )
          : undefined,
      ]);

    return {
      titleEmbedding: titleEmbedding,
      descriptionEmbdding: descriptionEmbedding,
      imagesEmbedding: imageEmbeddings,
    };
  }

  @TryCatch()
  private async savePostEmbedding(
    postId: number,
    title: string,
    description: string | undefined,
    imageFiles: Express.Multer.File[],
  ): Promise<void> {
    const { titleEmbedding, descriptionEmbdding, imagesEmbedding } =
      await this.getVectorParams(title, description, imageFiles);

    const pointsVector: any[] = imagesEmbedding?.map((imageEmbedding) => {
      return {
        id: randomUUID(),
        vector: {
          title: titleEmbedding,
          description: descriptionEmbdding,
          images: imageEmbedding,
        },
        payload: { postId: postId },
      };
    }) as any[];

    const operationInfo = await this.qdrantClient.upsert(
      this.qdrantCollectionName,
      {
        wait: true,
        points: pointsVector,
      },
    );

    console.log('Upsert operation info:', operationInfo);
  }

  @TryCatch()
  private async updatePostEmbedding(
    postId: number,
    title: string | undefined,
    description: string | undefined,
    imageFiles: Express.Multer.File[],
  ): Promise<void> {
    const {
      titleEmbedding,
      descriptionEmbdding,
      imagesEmbedding,
    }: VectorParams = await this.getVectorParams(
      title,
      description,
      imageFiles,
    );

    const operationInfo = await this.qdrantClient.updateVectors(
      this.qdrantCollectionName,
      {
        points: [
          {
            id: postId,
            vector: {
              title: titleEmbedding,
              description: descriptionEmbdding,
              images: imagesEmbedding,
            },
          },
        ],
      },
    );

    console.log('Update operation info:', operationInfo);
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
}

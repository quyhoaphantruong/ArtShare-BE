import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { plainToInstance } from 'class-transformer';
import { StorageService } from 'src/storage/storage.service';
import { EmbeddingService } from 'src/embedding/embedding.service';
import { MediaType, Post } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client-rest';
import { TryCatch } from 'src/common/try-catch.decorator';
import { PostDetailsResponseDto } from './dto/response/post-details.dto';
import { UpdatePostDto } from './dto/request/update-post.dto';
import { FileUploadResponse } from 'src/storage/dto/response.dto';
import axios from 'axios';
import { PatchThumbnailDto } from './dto/request/patch-thumbnail.dto';
import { nanoid } from 'nanoid';
import { Readable } from 'stream';
import { VECTOR_DIMENSION } from 'src/embedding/embedding.utils';
import { SyncEmbeddingResponseDto } from 'src/common/response/sync-embedding.dto';
import { QdrantService } from 'src/embedding/qdrant.service';
import { CreatePostRequestDto } from './dto/request/create-post.dto';

class VectorParams {
  titleEmbedding: number[];
  descriptionEmbedding: number[];
  imagesEmbedding: number[];
}

class MediaTocreate {
  url: string;
  media_type: MediaType;
  creator_id: string;
}

export class MediaData {
  url: string;
  media_type: MediaType;
}

@Injectable()
export class PostsManagementService {
  private readonly qdrantCollectionName = 'posts';

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly embeddingService: EmbeddingService,
    private readonly qdrantClient: QdrantClient,
    private readonly qdrantService: QdrantService,
  ) {}

  @TryCatch("something went wrong with ensuring post collection exists")
  private async ensurePostCollectionExists() {
    const collectionExists = this.qdrantService.collectionExists(
      this.qdrantCollectionName,
    );

    if (!collectionExists) {
      await this.qdrantClient.createCollection(this.qdrantCollectionName, {
        vectors: {
          title: { size: VECTOR_DIMENSION, distance: 'Cosine' },
          description: { size: VECTOR_DIMENSION, distance: 'Cosine' },
          images: { size: VECTOR_DIMENSION, distance: 'Dot' },
        },
      });

      console.log(
        `Created Qdrant collection '${this.qdrantCollectionName}' with named vectors`,
      );
    }
  }

  @TryCatch()
  async createPost(
    request: CreatePostRequestDto,
    images: Express.Multer.File[],
    userId: string,
  ): Promise<PostDetailsResponseDto> {
    const { cate_ids = [], video_url, ...rest } = request;

    const { parsedCropMeta } = await this.validateCreateRequest(
      request,
      images,
    );

    const mediasToCreate = await this.buildMediasToCreate(
      images,
      userId,
      video_url,
    );

    const createdPost = await this.prisma.post.create({
      data: {
        user_id: userId,
        ...rest,
        medias: { create: mediasToCreate },
        categories: { connect: cate_ids.map((id) => ({ id })) },
        thumbnail_crop_meta: parsedCropMeta,
      },
      include: { medias: true, user: true, categories: true },
    });

    void this.upsertPostEmbedding(
      createdPost.id,
      createdPost.title,
      createdPost.description ?? undefined,
      images,
    );

    return plainToInstance(PostDetailsResponseDto, createdPost);
  }

  private async validateCreateRequest(
    request: CreatePostRequestDto,
    images: Express.Multer.File[],
  ): Promise<{ parsedCropMeta: any }> {
    const {
      cate_ids = [],
      video_url,
      thumbnail_url,
      title,
      description,
      ...rest
    } = request;

    console.log(request.thumbnail_crop_meta);
    // Validate and parse crop metadata
    // TODO: should define a proper type for this crop metadata
    let parsedCropMeta: any;
    try {
      parsedCropMeta = JSON.parse(request.thumbnail_crop_meta);
    } catch {
      throw new BadRequestException('Invalid thumbnail_crop_meta JSON');
    }

    // Ensure at least one media provided
    if (!video_url && images.length === 0) {
      throw new BadRequestException(
        'Provide video_url or upload at least one image',
      );
    }

    // Validate category IDs exist
    if (cate_ids.length) {
      const count = await this.prisma.category.count({
        where: { id: { in: cate_ids } },
      });
      if (count !== cate_ids.length) {
        throw new BadRequestException('One or more categories not found');
      }
    }

    return { parsedCropMeta };
  }

  private async buildMediasToCreate(
    images: Express.Multer.File[],
    userId: string,
    video_url?: string,
  ): Promise<MediaTocreate[]> {
    const mediasToCreate: MediaTocreate[] = [];

    if (video_url) {
      mediasToCreate.push({
        url: video_url,
        media_type: MediaType.video,
        creator_id: userId,
      });
    }

    if (images.length > 0) {
      const uploadedImages = await this.storageService.uploadFiles(
        images,
        'posts',
      );
      mediasToCreate.push(
        ...uploadedImages.map(({ url }) => ({
          url,
          media_type: MediaType.image,
          creator_id: userId,
        })),
      );
    }

    return mediasToCreate;
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
      thumbnail_url,
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

    // 1️⃣ Delete the old thumbnail if it’s been replaced
    const oldThumb = existingPost.thumbnail_url;
    if (thumbnail_url && oldThumb && thumbnail_url !== oldThumb) {
      await this.storageService.deleteFiles([oldThumb]);
    }

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
        thumbnail_crop_meta: JSON.parse(updatePostDto.thumbnail_crop_meta),
        thumbnail_url: thumbnail_url,
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

    this.upsertPostEmbedding(
      updatedPost.id,
      updatedPost.title,
      updatedPost.description ?? undefined,
      images,
    );

    return plainToInstance(PostDetailsResponseDto, updatedPost);
  }

  @TryCatch()
  async deletePost(postId: number): Promise<Post> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { medias: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }
    const deletedPost = await this.prisma.post.delete({
      where: { id: postId },
    });

    this.cleanupExternalResources(
      postId,
      post.medias.map((m) => m.url),
    ).catch((err) => {
      console.error(`Failed external cleanup for post ${postId}:`, err);
    });

    return deletedPost;
  }

  private async cleanupExternalResources(postId: number, urls: string[]) {
    if (urls.length) {
      await this.storageService.deleteFiles(urls);
    }
    await this.qdrantService.deletePoints(this.qdrantCollectionName, [postId]);
  }

  private async getVectorParams(
    title: string,
    description: string | undefined,
    imageFiles: Express.Multer.File[],
  ): Promise<VectorParams> {
    const [titleEmbedding, descriptionEmbedding, imagesEmbedding]: number[][] =
      await Promise.all([
        this.embeddingService.generateEmbeddingFromText(title),

        description
          ? this.embeddingService.generateEmbeddingFromText(description)
          : Promise.resolve(new Array(VECTOR_DIMENSION).fill(0)),

        imageFiles && imageFiles.length > 0
          ? Promise.all(
              imageFiles.map((image) =>
                this.embeddingService.generateEmbeddingFromImageBlob(
                  new Blob([image.buffer]),
                ),
              ),
            ).then((embeds: number[][]) => this.averageEmbeddings(embeds))
          : Promise.resolve(new Array(VECTOR_DIMENSION).fill(0)),
      ]);

    return {
      titleEmbedding: titleEmbedding,
      descriptionEmbedding: descriptionEmbedding,
      imagesEmbedding: imagesEmbedding,
    };
  }

  private averageEmbeddings(embeddings: number[][]): number[] {
    if (!embeddings || embeddings.length === 0) return []; // handle empty case safely
    const length = embeddings[0].length;
    const sum = new Array(length).fill(0);
    embeddings.forEach((vec) => {
      for (let i = 0; i < length; i++) {
        sum[i] += vec[i];
      }
    });
    return sum.map((val) => val / embeddings.length);
  }

  @TryCatch()
  private async upsertPostEmbedding(
    postId: number,
    title: string,
    description: string | undefined,
    imageFiles: Express.Multer.File[],
  ): Promise<void> {
    await this.ensurePostCollectionExists();
    const { titleEmbedding, descriptionEmbedding, imagesEmbedding } =
      await this.getVectorParams(title, description, imageFiles);

    const operationInfo = await this.qdrantClient.upsert(
      this.qdrantCollectionName,
      {
        wait: true,
        points: [
          {
            id: postId,
            vector: {
              title: titleEmbedding,
              description: descriptionEmbedding,
              images: imagesEmbedding,
            } as Record<string, number[]>,
          },
        ],
      },
    );

    console.log('Upsert operation info:', operationInfo);
  }

  @TryCatch()
  async syncPostEmbeddings(): Promise<SyncEmbeddingResponseDto> {
    // Check if the collection exists
    const collectionInfo = await this.qdrantClient.collectionExists(
      this.qdrantCollectionName,
    );
    if (!collectionInfo.exists) {
      throw new BadRequestException(
        `Collection '${this.qdrantCollectionName}' does not exist.`,
      );
    }

    // delete all points in the collection by using empty filter
    await this.qdrantClient.delete(this.qdrantCollectionName, {
      filter: {
        must: [],
      },
    });
    console.log(
      `Deleted all points in collection '${this.qdrantCollectionName}'.`,
    );

    const posts = await this.prisma.post.findMany({
      include: { medias: true },
    });

    if (!posts || posts.length === 0) {
      console.log('No posts found.');
      return {
        message: 'No posts found to sync',
        count: 0,
        syncedItems: [],
      };
    }
    console.log(`Found ${posts.length} posts to sync.`);

    const points = await Promise.all(
      posts.map(async (post) => {
        const imageMedias = post.medias.filter(
          (m) => m.media_type === MediaType.image,
        );
        const imageFiles: Express.Multer.File[] =
          await this.buildImageFilesFromUrls(imageMedias.map((m) => m.url));

        // get your embeddings
        const { titleEmbedding, descriptionEmbedding, imagesEmbedding } =
          await this.getVectorParams(
            post.title,
            post.description ?? undefined,
            imageFiles,
          );

        return {
          id: post.id,
          vector: {
            title: titleEmbedding,
            description: descriptionEmbedding,
            images: imagesEmbedding,
          } as Record<string, number[]>,
        };
      }),
    );

    const operationInfo = await this.qdrantClient.upsert(
      this.qdrantCollectionName,
      {
        wait: true,
        points: points,
      },
    );

    console.log('Upsert result:', operationInfo);
    return {
      message: 'Post embeddings synced successfully',
      count: points.length,
      syncedItems: points.map((point) => point.id.toString()),
    };
  }

  private async buildImageFilesFromUrls(
    imageUrls: string[],
  ): Promise<Express.Multer.File[]> {
    return await Promise.all(
      imageUrls.map(async (url) => {
        const res = await axios.get<ArrayBuffer>(url, {
          responseType: 'arraybuffer',
        });
        const buffer = Buffer.from(res.data);
        const ext = url.split('.').pop() ?? 'png';
        return {
          fieldname: 'file',
          originalname: `${nanoid()}.${ext}`,
          encoding: '7bit',
          mimetype: `image/${ext}`,
          buffer,
          size: buffer.length,
          destination: '',
          filename: '',
          path: '',
          stream: Readable.from(buffer),
        } as Express.Multer.File;
      }),
    );
  }

  async updateThumbnailCropMeta(
    postId: number,
    dto: PatchThumbnailDto,
    userId: string,
  ) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });

    if (!post || post.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: {
        thumbnail_crop_meta: { ...dto }, // assuming JSON column
      },
    });
  }
}

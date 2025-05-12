import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import { FileUploadResponse } from 'src/storage/dto/response.dto';
import axios from 'axios';
import { PatchThumbnailDto } from './dto/request/patch-thumbnail.dto';
import { nanoid } from 'nanoid';
import { Readable } from 'stream';
import { VECTOR_DIMENSION } from 'src/embedding/embedding.utils';
import { SyncEmbeddingResponseDto } from 'src/common/response/sync-embedding.dto';

class VectorParams {
  titleEmbedding: number[];
  descriptionEmbedding: number[];
  imagesEmbedding: number[];
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
  ) {}

  private async ensurePostCollectionExists() {
    const collectionInfo = await this.qdrantClient.collectionExists(
      this.qdrantCollectionName,
    );

    if (!collectionInfo.exists) {
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
    createPostDto: CreatePostDto,
    images: Express.Multer.File[],
    userId: string,
  ): Promise<PostDetailsResponseDto> {
    const { cate_ids, video_url, thumbnail_url, ...createPostData } =
      createPostDto;

    Logger.debug(
      `Thumbnail crop metadata: ${createPostDto.thumbnail_crop_meta}`,
      'PostsManagementService',
    );

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
        thumbnail_crop_meta: JSON.parse(createPostDto.thumbnail_crop_meta),
      },
      include: { medias: true, user: true, categories: true },
    });

    await this.ensurePostCollectionExists();

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

    this.updatePostEmbedding(
      postId,
      updatedPost.title,
      updatedPost.description ?? undefined,
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
  private async savePostEmbedding(
    postId: number,
    title: string,
    description: string | undefined,
    imageFiles: Express.Multer.File[],
  ): Promise<void> {
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
  private async updatePostEmbedding(
    postId: number,
    title: string,
    description: string | undefined,
    imageFiles: Express.Multer.File[],
  ): Promise<void> {
    const {
      titleEmbedding,
      descriptionEmbedding,
      imagesEmbedding,
    }: VectorParams = await this.getVectorParams(
      title,
      description,
      imageFiles,
    );

    const pointVector = [
      {
        id: postId,
        vector: {
          title: titleEmbedding,
          description: descriptionEmbedding,
          images: imagesEmbedding,
        } as Record<string, number[]>,
      },
    ];

    const operationInfo = await this.qdrantClient.updateVectors(
      this.qdrantCollectionName,
      {
        points: pointVector,
      },
    );

    console.log('Update operation info:', operationInfo);
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

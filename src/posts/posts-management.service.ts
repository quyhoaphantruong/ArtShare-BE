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
import { FileUploadResponse } from 'src/storage/dto/response.dto';

class VectorParams {
  titleEmbedding?: number[];
  descriptionEmbedding?: number[];
  imagesEmbedding?: number[][];
}

export class MediaData {
  url: string;
  media_type: MediaType;
}

@Injectable()
export class PostsManagementService {
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
      descriptionEmbedding: descriptionEmbedding,
      imagesEmbedding: imageEmbeddings,
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

    // 🔥 Ensure no undefined is passed!
    if (!titleEmbedding) {
      throw new Error('titleEmbedding is required but missing!');
    }
    const averageImagesEmbedding =
      imagesEmbedding && imagesEmbedding.length > 0
        ? this.averageEmbeddings(imagesEmbedding)
        : new Array(512).fill(0); // 512 = your images vector size
    const safeDescriptionEmbedding =
      descriptionEmbedding ?? new Array(512).fill(0); // 768 = your description vector size
    const pointsVector = [
      {
        id: postId,
        vector: {
          title: titleEmbedding,
          description: safeDescriptionEmbedding,
          images: averageImagesEmbedding,
        } as Record<string, number[]>,
      },
    ];

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
      descriptionEmbedding,
      imagesEmbedding,
    }: VectorParams = await this.getVectorParams(
      title,
      description,
      imageFiles,
    );

    if (!titleEmbedding) {
      throw new Error('titleEmbedding is required but missing!');
    }

    const safeDescriptionEmbedding =
      descriptionEmbedding ?? new Array(512).fill(0);

    const averageImagesEmbedding =
      imagesEmbedding && imagesEmbedding.length > 0
        ? this.averageEmbeddings(imagesEmbedding)
        : new Array(512).fill(0);

    const pointVector = [
      {
        id: postId,
        vector: {
          title: titleEmbedding,
          description: safeDescriptionEmbedding,
          images: averageImagesEmbedding,
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
}

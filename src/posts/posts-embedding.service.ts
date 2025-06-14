import { Injectable, Logger } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client-rest';
import axios from 'axios';
import { nanoid } from 'nanoid';
import { SyncEmbeddingResponseDto } from 'src/common/response/sync-embedding.dto';
import { TryCatch } from 'src/common/try-catch.decorator';
import { EmbeddingService } from 'src/embedding/embedding.service';
import {
  postsCollectionName,
  VECTOR_DIMENSION,
} from 'src/embedding/embedding.utils';
import { QdrantService } from 'src/embedding/qdrant.service';
import { PrismaService } from 'src/prisma.service';
import { Readable } from 'stream';

@Injectable()
export class PostsEmbeddingService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly qdrantClient: QdrantClient,
    private readonly qdrantService: QdrantService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly logger = new Logger(PostsEmbeddingService.name); // Create an instance of Logger for this service

  @TryCatch()
  async upsertPostEmbedding(
    postId: number,
    title: string,
    description: string | undefined,
    imageFiles: Express.Multer.File[],
  ): Promise<void> {
    const vectorPayload = await this.buildVectorPayload(
      title,
      description,
      imageFiles,
    );

    const operationInfo = await this.qdrantClient.upsert(postsCollectionName, {
      wait: true,
      points: [
        {
          id: postId,
          vector: vectorPayload,
        },
      ],
    });

    this.logger.log('Upsert post info', operationInfo);
  }

  @TryCatch()
  async updateEmbeddingVectors(
    postId: number,
    title: string,
    description: string | undefined,
    imageFiles: Express.Multer.File[],
  ): Promise<void> {
    const vectorPayload = await this.buildVectorPayload(
      title,
      description,
      imageFiles,
    );

    const operationInfo = await this.qdrantClient.updateVectors(
      postsCollectionName,
      {
        wait: true,
        points: [
          {
            id: postId,
            vector: vectorPayload,
          },
        ],
      },
    );

    this.logger.log('Upsert post info', operationInfo);
  }

  private async buildVectorPayload(
    title: string,
    description: string | undefined,
    imageFiles: Express.Multer.File[],
  ): Promise<Record<string, number[]>> {
    const { titleEmbedding, descriptionEmbedding, imagesEmbedding } =
      await this.getVectorParams(title, description, imageFiles);
    const vectorPayload: Record<string, number[]> = {
      title: titleEmbedding,
    };
    if (descriptionEmbedding) {
      vectorPayload.description = descriptionEmbedding;
    }
    if (imagesEmbedding) {
      vectorPayload.images = imagesEmbedding;
    }
    return vectorPayload;
  }

  @TryCatch('something went wrong with ensuring post collection exists')
  private async ensurePostCollectionExists() {
    const collectionExists =
      this.qdrantService.collectionExists(postsCollectionName);

    if (!collectionExists) {
      await this.qdrantClient.createCollection(postsCollectionName, {
        vectors: {
          title: { size: VECTOR_DIMENSION, distance: 'Cosine' },
          description: { size: VECTOR_DIMENSION, distance: 'Cosine' },
          images: { size: VECTOR_DIMENSION, distance: 'Cosine' },
        },
      });

      console.log(
        `Created Qdrant collection '${postsCollectionName}' with named vectors`,
      );
    }
  }

  private async getVectorParams(
    title: string,
    description: string | undefined,
    imageFiles: Express.Multer.File[],
  ): Promise<{
    titleEmbedding: number[];
    descriptionEmbedding: number[] | null; // Can be null
    imagesEmbedding: number[] | null; // Can be null
  }> {
    const [titleEmbedding, descriptionEmbedding, imagesEmbedding] =
      await Promise.all([
        this.embeddingService.generateEmbeddingFromText(title),

        description
          ? this.embeddingService.generateEmbeddingFromText(description)
          : Promise.resolve(null), // Return null, not a zero-vector

        imageFiles?.length > 0
          ? Promise.all(
              imageFiles.map((image) =>
                this.embeddingService.generateEmbeddingFromImageBlob(
                  new Blob([image.buffer]),
                ),
              ),
            ).then((embeds) => this.averageEmbeddings(embeds))
          : Promise.resolve(null), // Return null, not a zero-vector
      ]);

    return { titleEmbedding, descriptionEmbedding, imagesEmbedding };
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
  async syncPostEmbeddings(): Promise<SyncEmbeddingResponseDto> {
    this.logger.log(
      `Clearing all points from collection: ${postsCollectionName}`,
    );
    await this.qdrantService.deleteAllPoints(postsCollectionName);

    const posts = await this.prisma.post.findMany({
      include: { medias: true },
    });

    if (!posts || posts.length === 0) {
      this.logger.log('No posts found to sync.');
      return {
        message: 'No posts found to sync',
        count: 0,
        syncedItems: [],
      };
    }

    this.logger.log(`Found ${posts.length} posts. Processing all at once...`);

    // 3. Process all posts concurrently using Promise.allSettled for resilience
    const results = await Promise.allSettled(
      posts.map(async (post) => {
        const imageMedias = post.medias.filter(
          (m) => m.media_type === MediaType.image,
        );
        const imageFiles: Express.Multer.File[] =
          await this.buildImageFilesFromUrls(imageMedias.map((m) => m.url));

        const vectorPayload = await this.buildVectorPayload(
          post.title,
          post.description ?? undefined,
          imageFiles,
        );

        return {
          id: post.id,
          vector: vectorPayload,
        };
      }),
    );

    // 5. Filter out any posts that failed during the embedding process
    const successfulPoints: { id: number; vector: Record<string, number[]> }[] =
      [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulPoints.push(result.value);
      } else {
        this.logger.error(
          `Failed to process post ID ${posts[index].id}:`,
          result.reason,
        );
      }
    });

    // 6. Upsert all successful points in a single request (Payload Size Risk!)
    if (successfulPoints.length > 0) {
      this.logger.log(
        `Upserting ${successfulPoints.length} points to Qdrant...`,
      );
      const operationInfo = await this.qdrantClient.upsert(
        postsCollectionName,
        {
          wait: true,
          points: successfulPoints,
        },
      );
      this.logger.log('Upsert result:', operationInfo);
    }

    const totalSyncedCount = successfulPoints.length;
    const totalFailedCount = posts.length - totalSyncedCount;

    this.logger.log(
      `Sync complete. Total synced: ${totalSyncedCount}. Failed: ${totalFailedCount}.`,
    );

    return {
      message: `Sync finished. ${totalSyncedCount} posts synced, ${totalFailedCount} failed.`,
      count: totalSyncedCount,
      syncedItems: successfulPoints.map((point) => point.id.toString()),
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

        console.log(`Fetched image from ${url}: ${res}`);
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
}

import { Injectable, Logger } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client-rest';
import { SyncEmbeddingResponseDto } from 'src/common/response/sync-embedding.dto';
import { TryCatch } from 'src/common/try-catch.decorator';
import { EmbeddingService } from 'src/embedding/embedding.service';
import { postsCollectionName } from 'src/embedding/embedding.utils';
import { QdrantService } from 'src/embedding/qdrant.service';
import { PrismaService } from 'src/prisma.service';

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
    const [titleEmbedding, descriptionEmbedding, imagesEmbedding] =
      await Promise.all([
        this.embeddingService.generateEmbeddingFromText(title),

        description
          ? this.embeddingService.generateEmbeddingFromText(description)
          : Promise.resolve(null),

        imageFiles?.length > 0
          ? Promise.all(
              imageFiles.map((image) =>
                this.embeddingService.generateEmbeddingFromImageBlob(
                  new Blob([image.buffer]),
                ),
              ),
            ).then((embeds) => this.averageEmbeddings(embeds))
          : Promise.resolve(null),
      ]);

    const vectorPayload: Record<string, number[]> = {
      title: titleEmbedding,
    };
    if (descriptionEmbedding) {
      vectorPayload.description = descriptionEmbedding;
    }
    if (imagesEmbedding) {
      vectorPayload.images = imagesEmbedding;
    }

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
  async updatePostEmbedding(
    postId: number,
    updatedTitle: string | undefined,
    updatedDescription: string | undefined,
    updatedImageUrls: string[] | undefined,
  ): Promise<void> {
    await Promise.all([
      this.updateVectors(
        postId,
        updatedTitle,
        updatedDescription,
        updatedImageUrls,
      ),
      this.deleteVectors(postId, updatedDescription, updatedImageUrls),
    ]);

    this.logger.log('Updated post embedding completed');
  }

  async updateVectors(
    postId: number,
    updatedTitle: string | undefined,
    updatedDescription: string | undefined,
    updatedImageUrls: string[] | undefined,
  ) {
    const vectorPayload = await this.buildVectorPayload(
      updatedTitle,
      updatedDescription,
      updatedImageUrls,
    );

    if (Object.keys(vectorPayload).length === 0) {
      this.logger.log(
        `No vectors to update for post ${postId}. Skipping update.`,
      );
      return;
    }

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

    this.logger.log(
      `Post with id ${postId} has update its vectors`,
      operationInfo,
    );
  }

  private async buildVectorPayload(
    title: string | undefined,
    description: string | undefined,
    imageUrls: string[] | undefined,
  ): Promise<Record<string, number[]>> {
    const [titleEmbedding, descriptionEmbedding, imagesEmbedding] =
      await Promise.all([
        title
          ? await this.embeddingService.generateEmbeddingFromText(title)
          : Promise.resolve(null),

        description && description.trim().length > 0
          ? this.embeddingService.generateEmbeddingFromText(description)
          : Promise.resolve(null),

        imageUrls && imageUrls.length > 0
          ? Promise.all(
              imageUrls.map((url) =>
                this.embeddingService.generateEmbeddingFromImageUrl(url),
              ),
            ).then((embeds) => this.averageEmbeddings(embeds))
          : Promise.resolve(null),
      ]);

    const vectorPayload: Record<string, number[]> = {};

    if (titleEmbedding) {
      vectorPayload.title = titleEmbedding;
    }
    if (descriptionEmbedding) {
      vectorPayload.description = descriptionEmbedding;
    }
    if (imagesEmbedding) {
      vectorPayload.images = imagesEmbedding;
    }
    return vectorPayload;
  }

  async deleteVectors(
    postId: number,
    updatedDescription: string | undefined,
    updatedImageUrls: string[] | undefined,
  ) {
    const vectorsToDelete = [];
    if (updatedDescription !== undefined && updatedDescription.trim() === '') {
      vectorsToDelete.push('description');
    }
    if (updatedImageUrls && updatedImageUrls.length === 0) {
      vectorsToDelete.push('images');
    }

    if (vectorsToDelete.length === 0) {
      this.logger.log(
        `No vectors to delete for post ${postId}. Skipping deletion.`,
      );
      return;
    }

    const operationInfo = await this.qdrantClient.deleteVectors(
      postsCollectionName,
      {
        wait: true,
        points: [postId],
        vector: vectorsToDelete,
      },
    );

    this.logger.log(
      `Post with id ${postId} has delete vectors ${vectorsToDelete.join(', ')}`,
      operationInfo,
    );
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
      posts.map(async (post) => ({
        id: post.id,
        vector: await this.buildVectorPayload(
          post.title,
          post.description ?? undefined,
          post.medias
            .filter((m) => m.media_type === MediaType.image)
            .map((m) => m.url),
        ),
      })),
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
}

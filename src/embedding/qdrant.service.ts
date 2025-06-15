import { Injectable, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { SyncEmbeddingResponseDto } from 'src/common/response/sync-embedding.dto';
import { TryCatch } from 'src/common/try-catch.decorator';

@Injectable()
export class QdrantService {
  constructor(private readonly qdrantClient: QdrantClient) {}

  private readonly logger = new Logger(QdrantService.name);

  @TryCatch()
  async collectionExists(collectionName: string): Promise<boolean> {
    const collectionInfo =
      await this.qdrantClient.collectionExists(collectionName);
    return collectionInfo.exists;
  }

  @TryCatch()
  async validateCollectionExistence(collectionName: string): Promise<void> {
    const collectionExists = await this.collectionExists(collectionName);
    if (!collectionExists) {
      throw new Error(`Collection '${collectionName}' does not exist.`);
    }
  }

  @TryCatch()
  async deletePoints(collectionName: string, ids: number[]): Promise<void> {
    await this.validateCollectionExistence(collectionName);

    await this.qdrantClient.delete(collectionName, {
      wait: true,
      points: ids,
    });
  }

  @TryCatch()
  async deleteAllPoints(collectionName: string): Promise<void> {
    await this.validateCollectionExistence(collectionName);

    // delete all points in the collection by using empty filter
    await this.qdrantClient.delete(collectionName, {
      filter: {
        must: [],
      },
    });
    console.log(`Deleted all points in collection '${collectionName}'.`);
  }

  /**
   * A generic, centralized method to sync embeddings for any Prisma model.
   * @param collectionName The name of the Qdrant collection.
   * @param modelName A human-readable name for the model (e.g., 'blog', 'post') for logging.
   * @param fetchItemsFn A function that fetches all items from Prisma.
   * @param buildVectorFn A function that transforms a single item into a vector payload.
   * @returns A promise that resolves to the sync response DTO.
   */
  @TryCatch()
  async _syncEmbeddingsForModel<T extends { id: number }>(
    collectionName: string,
    modelName: string,
    fetchItemsFn: () => Promise<T[]>,
    buildVectorFn: (item: T) => Promise<VectorPayload>,
  ): Promise<SyncEmbeddingResponseDto> {
    // 1. Clear the existing collection
    this.logger.log(`Clearing all points from collection: ${collectionName}`);
    await this.deleteAllPoints(collectionName);

    // 2. Fetch all items using the provided function
    const items = await fetchItemsFn();

    if (!items || items.length === 0) {
      this.logger.log(`No ${modelName}s found to sync.`);
      return {
        message: `No ${modelName}s found to sync`,
        count: 0,
        syncedItems: [],
      };
    }

    this.logger.log(`Found ${items.length} ${modelName}(s). Processing...`);

    // 3. Process all items concurrently using the provided vector-building function
    const results = await Promise.allSettled(items.map(buildVectorFn));

    // 4. Filter out any items that failed during the embedding process
    const successfulPoints: { id: number; vector: Record<string, number[]> }[] =
      [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulPoints.push(result.value);
      } else {
        this.logger.error(
          `Failed to process ${modelName} ID ${items[index].id}:`,
          result.reason,
        );
      }
    });

    // 5. Upsert all successful points in a single request
    if (successfulPoints.length > 0) {
      this.logger.log(
        `Upserting ${successfulPoints.length} points to Qdrant collection: ${collectionName}...`,
      );
      // Note: If you need to batch this for large datasets, this is the place to add that logic.
      await this.qdrantClient.upsert(collectionName, {
        wait: true,
        points: successfulPoints,
      });
      this.logger.log('Upsert complete.');
    }

    // 6. Log and return the final results
    const totalSyncedCount = successfulPoints.length;
    const totalFailedCount = items.length - totalSyncedCount;

    this.logger.log(
      `Sync for ${modelName}s complete. Total synced: ${totalSyncedCount}. Failed: ${totalFailedCount}.`,
    );

    return {
      message: `Sync finished. ${totalSyncedCount} ${modelName}s synced, ${totalFailedCount} failed.`,
      count: totalSyncedCount,
      syncedItems: successfulPoints.map((point) => point.id.toString()),
    };
  }
}
// A helper type for clarity
export type VectorPayload = { id: number; vector: Record<string, number[]> };

import { Injectable } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { TryCatch } from 'src/common/try-catch.decorator';

@Injectable()
export class QdrantService {
  constructor(private readonly qdrantClient: QdrantClient) {}

  @TryCatch()
  async collectionExists(collectionName: string): Promise<boolean> {
    const collectionInfo =
      await this.qdrantClient.collectionExists(collectionName);
    return collectionInfo.exists;
  }

  @TryCatch()
  async validateCollectionExistence(collectionName: string,): Promise<void> {
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
    console.log(
      `Deleted all points in collection '${collectionName}'.`,
    );
  }
}

import { QdrantClient } from "@qdrant/js-client-rest";
import { TryCatch } from "src/common/try-catch.decorator";

export class QdrantService {
  constructor(
    private readonly qdrantClient: QdrantClient,
  ) { }
  
  @TryCatch()
  async collectionExists(collectionName: string): Promise<boolean> {
    const collectionInfo = await this.qdrantClient.collectionExists(
      collectionName,
    );
    return collectionInfo.exists;
  }

  @TryCatch()
  async deletePoints(collectionName: string, ids: number[]): Promise<void> {
    await this.qdrantClient.delete(collectionName, {
      wait: true,
      points: ids,
    });
  }
}

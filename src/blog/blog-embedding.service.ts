import { Injectable } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { TryCatch } from 'src/common/try-catch.decorator';
import { EmbeddingService } from 'src/embedding/embedding.service';

@Injectable()
export class BlogEmbeddingService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly qdrantClient: QdrantClient,
  ) { }
  
  private readonly qdrantCollectionName = 'blogs';

  @TryCatch()
  async upsertBlogEmbeddings(
    blogId: number,
    title: string,
    content: string,
  ): Promise<void> {
    const [titleEmbedding, contentEmbedding] = await Promise.all([
      this.embeddingService.generateEmbeddingFromText(title),
      this.embeddingService.generateEmbeddingFromText(content),
    ]);

    const operationInfo = await this.qdrantClient.upsert(
      this.qdrantCollectionName,
      {
        wait: true,
        points: [
          {
            id: blogId,
            vector: {
              title: titleEmbedding,
              content: contentEmbedding,
            },
            payload: { blogId: blogId },
          },
        ],
      },
    );

    console.log('Upsert operation info:', operationInfo);
  }
}

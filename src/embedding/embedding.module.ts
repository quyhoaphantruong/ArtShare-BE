import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { QdrantClient } from '@qdrant/js-client-rest';

@Module({
  providers: [
    EmbeddingService,
    {
      provide: QdrantClient,
      useFactory: () => {
        return new QdrantClient({
          url: process.env.QDRANT_URL,
          port: 6333,
          apiKey: process.env.QDRANT_API_KEY,
        });
      },
    },
  ],
  exports: [EmbeddingService, QdrantClient],
})
export class EmbeddingModule {}

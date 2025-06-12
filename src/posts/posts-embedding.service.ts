import { Injectable } from '@nestjs/common';
import { MediaType, PrismaClient } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client-rest';
import axios from 'axios';
import { nanoid } from 'nanoid';
import { SyncEmbeddingResponseDto } from 'src/common/response/sync-embedding.dto';
import { TryCatch } from 'src/common/try-catch.decorator';
import { EmbeddingService } from 'src/embedding/embedding.service';
import { VECTOR_DIMENSION } from 'src/embedding/embedding.utils';
import { QdrantService } from 'src/embedding/qdrant.service';
import { Readable } from 'stream';

class VectorParams {
  titleEmbedding: number[];
  descriptionEmbedding: number[];
  imagesEmbedding: number[];
}

@Injectable()
export class PostsEmbeddingService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly qdrantClient: QdrantClient,
    private readonly qdrantService: QdrantService,
    private readonly prisma: PrismaClient,
  ) {}

  private readonly collectionName = 'posts';

  @TryCatch()
  async upsertPostEmbedding(
    postId: number,
    title: string,
    description: string | undefined,
    imageFiles: Express.Multer.File[],
  ): Promise<void> {
    await this.ensurePostCollectionExists();
    const { titleEmbedding, descriptionEmbedding, imagesEmbedding } =
      await this.getVectorParams(title, description, imageFiles);

    const operationInfo = await this.qdrantClient.upsert(this.collectionName, {
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
    });

    console.log('Upsert operation info:', operationInfo);
  }

  @TryCatch('something went wrong with ensuring post collection exists')
  private async ensurePostCollectionExists() {
    const collectionExists = this.qdrantService.collectionExists(
      this.collectionName,
    );

    if (!collectionExists) {
      await this.qdrantClient.createCollection(this.collectionName, {
        vectors: {
          title: { size: VECTOR_DIMENSION, distance: 'Cosine' },
          description: { size: VECTOR_DIMENSION, distance: 'Cosine' },
          images: { size: VECTOR_DIMENSION, distance: 'Dot' },
        },
      });

      console.log(
        `Created Qdrant collection '${this.collectionName}' with named vectors`,
      );
    }
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
  async syncPostEmbeddings(): Promise<SyncEmbeddingResponseDto> {
    await this.qdrantService.deleteAllPoints(this.collectionName);

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

    const operationInfo = await this.qdrantClient.upsert(this.collectionName, {
      wait: true,
      points: points,
    });

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

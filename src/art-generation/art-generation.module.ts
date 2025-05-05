import { Module } from '@nestjs/common';
import { ArtGenerationController } from './art-generation.controller';
import { ArtGenerationService } from './art-generation.service';
import { GptImageStrategy } from './image-strategies/gpt-image.strategy';
import { ImageGeneratorStrategy } from './image-generator.interface';
import { StorageService } from 'src/storage/storage.service';
import { S3StorageProvider } from 'src/storage/providers/s3-storage.provider';

@Module({
  controllers: [ArtGenerationController],
  providers: [
    ArtGenerationService,
    GptImageStrategy,
    {
      provide: 'IMAGE_GENERATORS',
      useFactory: (
        gpt: GptImageStrategy,
      ) => [gpt] as ImageGeneratorStrategy[],
      inject: [GptImageStrategy],
    },
    StorageService,
    S3StorageProvider,
  ]
})
export class ArtGenerationModule {}

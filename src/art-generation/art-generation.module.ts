import { Module } from '@nestjs/common';
import { ArtGenerationController } from './art-generation.controller';
import { ArtGenerationService } from './art-generation.service';
import { GptImageStrategy } from './image-strategies/gpt-image.strategy';
import { ImageGeneratorStrategy } from './image-generator.interface';
import { StorageService } from 'src/storage/storage.service';
import { S3StorageProvider } from 'src/storage/providers/s3-storage.provider';
import { PromptService } from './prompt.service';
import { AuthModule } from 'src/auth/auth.module';
import { UsageModule } from 'src/usage/usage.module';

@Module({
  imports: [AuthModule, UsageModule],
  controllers: [ArtGenerationController],
  providers: [
    ArtGenerationService,
    GptImageStrategy,
    {
      provide: 'IMAGE_GENERATORS',
      useFactory: (gpt: GptImageStrategy) => [gpt] as ImageGeneratorStrategy[],
      inject: [GptImageStrategy],
    },
    StorageService,
    S3StorageProvider,
    PromptService,
  ],
  exports: [ArtGenerationService],
})
export class ArtGenerationModule {}

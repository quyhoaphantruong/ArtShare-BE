import { Module } from '@nestjs/common';
import { AutoPostGenerateService } from './auto-post-generate.service';
import { AutoPostService } from './auto-post.service';
import { ArtGenerationModule } from 'src/art-generation/art-generation.module';

@Module({
  imports: [ArtGenerationModule],
  providers: [AutoPostGenerateService, AutoPostService],
  exports: [AutoPostGenerateService],
})
export class AutoPostModule {}

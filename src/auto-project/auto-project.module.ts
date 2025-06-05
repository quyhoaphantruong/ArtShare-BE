import { Module } from '@nestjs/common';
import { AutoProjectController } from './auto-project.controller';
import { AutoProjectReadService } from './auto-project-read.service';
import { AutoPostModule } from 'src/auto-post/auto-post.module';
import { AuthModule } from 'src/auth/auth.module';
import { AutoProjectWriteService } from './auto-project-write.service';
import { UsageModule } from 'src/usage/usage.module';
import { ArtGenerationModule } from 'src/art-generation/art-generation.module';
import { AutoPostGenerateService } from 'src/auto-post/auto-post-generate.service';

@Module({
  imports: [AutoPostModule, AuthModule, UsageModule, ArtGenerationModule],
  providers: [
    AutoProjectWriteService,
    AutoProjectReadService,
    AutoPostGenerateService,
  ],
  controllers: [AutoProjectController],
})
export class AutoProjectModule {}

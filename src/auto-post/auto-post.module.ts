import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AutoPostController } from './auto-post.controller';
import { AutoPostService } from './auto-post.service';
import { EncryptionModule } from 'src/encryption/encryption.module';
import { AuthModule } from 'src/auth/auth.module';
import { ArtGenerationModule } from 'src/art-generation/art-generation.module';
import { AutoPostGenerateService } from './auto-post-generate.service';

@Module({
  imports: [ArtGenerationModule, HttpModule, EncryptionModule, AuthModule],
  controllers: [AutoPostGenerateService, AutoPostController],
  providers: [AutoPostService],
})
export class AutoPostModule {}

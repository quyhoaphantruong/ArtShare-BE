import { Module } from '@nestjs/common';
import { PostsManagementService } from './posts-management.service';
import { PostsController } from './posts.controller';
import { StorageService } from 'src/storage/storage.service';
import { S3StorageProvider } from 'src/storage/providers/s3-storage.provider';
import { AuthModule } from 'src/auth/auth.module';
import { EmbeddingModule } from 'src/embedding/embedding.module';
import { PostsExploreService } from './posts-explore.service';
import { WorkflowAssistService } from './workflow-assist.service';
import { PostsEmbeddingService } from './posts-embedding.service';

@Module({
  imports: [AuthModule, EmbeddingModule],
  providers: [
    PostsExploreService,
    PostsManagementService,
    StorageService,
    S3StorageProvider,
    WorkflowAssistService,
    PostsEmbeddingService,
  ],
  controllers: [PostsController],
})
export class PostsModule {}

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
import { LikesModule } from 'src/likes/likes.module';
import { LikesService } from 'src/likes/likes.service';
import { PostsManagementValidator } from './validator/posts-management.validator';

@Module({
  imports: [AuthModule, EmbeddingModule, LikesModule],
  providers: [
    PostsExploreService,
    PostsManagementService,
    StorageService,
    S3StorageProvider,
    WorkflowAssistService,
    PostsEmbeddingService,
    LikesService,
    PostsManagementValidator,
  ],
  controllers: [PostsController],
})
export class PostsModule {}

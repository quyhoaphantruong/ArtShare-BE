import { Module } from '@nestjs/common';
import { BlogController } from './blog.controller';
import { AuthModule } from 'src/auth/auth.module';
import { EmbeddingModule } from 'src/embedding/embedding.module';
import { BlogManagementService } from './blog-management.service';
import { BlogExploreService } from './blog-explore.service';
import { BlogEmbeddingService } from './blog-embedding.service';

@Module({
  imports: [AuthModule, EmbeddingModule],
  providers: [BlogManagementService, BlogExploreService, BlogEmbeddingService],
  controllers: [BlogController],
})
export class BlogModule {}

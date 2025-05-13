import { Module } from '@nestjs/common';
import { BlogController } from './blog.controller';
import { AuthModule } from 'src/auth/auth.module';
import { EmbeddingService } from 'src/embedding/embedding.service';
import { EmbeddingModule } from 'src/embedding/embedding.module';
import { BlogManagementService } from './blog-management.service';
import { BlogExploreService } from './blog-explore.service';

@Module({
  imports: [AuthModule, EmbeddingModule],
  providers: [BlogManagementService, BlogExploreService],
  controllers: [BlogController],
})
export class BlogModule {}

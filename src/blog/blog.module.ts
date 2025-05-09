import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { AuthModule } from 'src/auth/auth.module';
import { EmbeddingService } from 'src/embedding/embedding.service';

@Module({
  imports: [AuthModule],
  providers: [BlogService, EmbeddingService],
  controllers: [BlogController],
})
export class BlogModule {}

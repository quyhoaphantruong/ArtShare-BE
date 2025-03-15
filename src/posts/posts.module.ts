import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PrismaService } from 'src/prisma.service';
import { S3Service } from 'src/s3/s3.service';

@Module({
  providers: [PostsService, PrismaService, S3Service],
  controllers: [PostsController]
})
export class PostsModule {}

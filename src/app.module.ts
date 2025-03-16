import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { ExampleModule } from './example/example.module';
import { PostsModule } from './posts/posts.module';
import { S3Service } from './s3/s3.service';
import { LikesModule } from './likes/likes.module';
import { SharesModule } from './shares/shares.module';

@Module({
  imports: [ExampleModule, PostsModule, LikesModule, SharesModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, S3Service]
})
export class AppModule {}

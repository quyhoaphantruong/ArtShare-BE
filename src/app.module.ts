import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { ExampleModule } from './example/example.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [ExampleModule, PostsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService]
})
export class AppModule {}

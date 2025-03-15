import { Module } from '@nestjs/common';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [LikesService],
  controllers: [LikesController, PrismaService]
})
export class LikesModule {}

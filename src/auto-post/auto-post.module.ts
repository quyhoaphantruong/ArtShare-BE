import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AutoPostController } from './auto-post.controller';
import { AutoPostService } from './auto-post.service';
import { EncryptionModule } from 'src/encryption/encryption.module';

@Module({
  imports: [HttpModule, EncryptionModule],
  controllers: [AutoPostController],
  providers: [AutoPostService],
})
export class AutoPostModule {}

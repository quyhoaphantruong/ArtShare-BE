import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AutoPostController } from './auto-post.controller';
import { AutoPostService } from './auto-post.service';
import { EncryptionModule } from 'src/encryption/encryption.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [HttpModule, EncryptionModule, AuthModule],
  controllers: [AutoPostController],
  providers: [AutoPostService],
})
export class AutoPostModule {}

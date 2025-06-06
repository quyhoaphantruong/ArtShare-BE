import { forwardRef, Module } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';
import { PrismaModule } from 'src/prisma.module';
import { EncryptionModule } from 'src/encryption/encryption.module';
import { AuthModule } from 'src/auth/auth.module';
import { PlatformScheduler } from './platform.schedule';

@Module({
  imports: [forwardRef(() => AuthModule), PrismaModule, EncryptionModule],
  controllers: [PlatformController],
  providers: [PlatformService, PlatformScheduler],
  exports: [PlatformService],
})
export class PlatformModule {}

import { Module } from '@nestjs/common';
import { AutoProjectController } from './auto-project.controller';
import { AutoProjectReadService } from './auto-project-read.service';
import { AutoPostModule } from 'src/auto-post/auto-post.module';
import { AuthModule } from 'src/auth/auth.module';
import { AutoProjectWriteService } from './auto-project-write.service';
import { UsageModule } from 'src/usage/usage.module';

@Module({
  imports: [AutoPostModule, AuthModule, UsageModule],
  providers: [AutoProjectWriteService, AutoProjectReadService],
  controllers: [AutoProjectController],
})
export class AutoProjectModule {}

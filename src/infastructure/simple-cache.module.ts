import { Module, Global } from '@nestjs/common';
import { SimpleCacheService } from './simple-cache.service';
import { ScheduleModule } from '@nestjs/schedule';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [SimpleCacheService],
  exports: [SimpleCacheService],
})
export class CacheModule {}
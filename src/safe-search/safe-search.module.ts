import { Module } from '@nestjs/common';
import { SafeSearchService } from './safe-search.service';
import { SafeSearchController } from './safe-search.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [SafeSearchService],
  controllers: [SafeSearchController]
})
export class SafeSearchModule {}

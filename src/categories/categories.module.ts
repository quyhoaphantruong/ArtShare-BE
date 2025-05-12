import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesManagementService } from './categories-management.service';
import { AuthModule } from 'src/auth/auth.module';
import { EmbeddingModule } from 'src/embedding/embedding.module';
import { CategoriesSearchService } from './categories-search.service';

@Module({
  imports: [AuthModule, EmbeddingModule],
  controllers: [CategoriesController],
  providers: [
    CategoriesSearchService,
    CategoriesManagementService,
  ],
})
export class CategoriesModule {}

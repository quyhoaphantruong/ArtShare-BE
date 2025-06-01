import { CategoryType } from '@prisma/client';
import { Expose } from 'class-transformer';

export class PostCategoryResponseDto {
  @Expose()
  id: number;
  @Expose()
  name: string;
  @Expose()
  type: CategoryType;
}

import { Expose } from 'class-transformer';
import { CategoryType } from 'src/categories/dto/request/create-category.dto';

export class PostCategoryResponseDto {
  @Expose()
  id: number;
  @Expose()
  name: string;
  @Expose()
  type: CategoryType;
}

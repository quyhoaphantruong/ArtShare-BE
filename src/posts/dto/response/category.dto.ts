import { CategoryType } from 'src/categories/dto/request/create-category.dto';

export class PostCategoryResponseDto {
  id: number;
  name: string;
  type: CategoryType;
}

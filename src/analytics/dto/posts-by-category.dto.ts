import { ApiProperty } from '@nestjs/swagger';

export class CategoryPostCountDto {
  @ApiProperty({ example: 'Photography', description: 'Name of the category' })
  categoryName: string;

  @ApiProperty({
    example: 120,
    description: 'Number of posts in this category',
  })
  postCount: number;
}

export class PostsByCategoryDto {
  @ApiProperty({
    type: [CategoryPostCountDto],
    description: 'List of categories with their post counts',
  })
  data: CategoryPostCountDto[];
}

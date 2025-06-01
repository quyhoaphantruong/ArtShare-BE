import { ApiProperty } from '@nestjs/swagger';

export class PopularCategoryDto {
  @ApiProperty({ example: 'Digital Art', description: 'Name of the category' })
  categoryName: string;

  @ApiProperty({
    example: 250,
    description: 'Number of posts in this category',
  })
  postCount: number;

  @ApiProperty({
    example: 5000,
    description:
      'Total engagement score for posts in this category (e.g., likes + comments + views)',
  })
  totalEngagementScore: number;
}

export class PopularCategoriesDto {
  @ApiProperty({
    type: [PopularCategoryDto],
    description: 'List of popular categories',
  })
  data: PopularCategoryDto[];
}

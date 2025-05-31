import { ApiProperty } from '@nestjs/swagger';

export class OverallPostStatsDto {
  @ApiProperty({ example: 5000, description: 'Total number of posts created' })
  totalPosts: number;

  @ApiProperty({
    example: 200,
    description: 'Number of new posts in the last 30 days',
  })
  newPostsLast30Days: number;

  @ApiProperty({ example: 4500, description: 'Number of published posts' })
  publishedPosts: number;

  @ApiProperty({ example: 500, description: 'Number of draft posts' })
  draftPosts: number;

  @ApiProperty({ example: 100, description: 'Number of private posts' })
  privatePosts: number;

  @ApiProperty({ example: 4900, description: 'Number of public posts' })
  publicPosts: number;

  @ApiProperty({ example: 300, description: 'Number of AI-created posts' })
  aiCreatedPosts: number;

  @ApiProperty({
    example: 50,
    description: 'Number of posts marked as mature content',
  })
  matureContentPosts: number;
}

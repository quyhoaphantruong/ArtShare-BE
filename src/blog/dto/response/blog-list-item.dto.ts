import { ApiProperty } from '@nestjs/swagger';
import { BlogUserInfoResponseDto } from './blog-user-info.dto';

export class BlogListItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'My Amazing Blog Post' })
  title: string;

  @ApiProperty({ example: 'This is the content of my blog post...' })
  content: string;

  @ApiProperty({ example: '2025-05-31T10:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2025-05-31T10:00:00.000Z' })
  updated_at: Date | null; 

  @ApiProperty({ example: 15 })
  like_count: number;

  @ApiProperty({ example: 8 })
  comment_count: number;

  @ApiProperty({ example: 3 })
  share_count: number;

  @ApiProperty({ example: 125 })
  view_count: number;

  @ApiProperty({ type: () => BlogUserInfoResponseDto })
  user: BlogUserInfoResponseDto;

  @ApiProperty({ example: true })
  is_published: boolean;
  
  @ApiProperty({
    type: [String],
    example: ['https://cdn.example.com/img1.jpg', 'https://cdn.example.com/img2.png'],
    description: 'An array of URLs (or file paths) pointing to each picture associated with this blog post',
  })
  pictures: string[];
}
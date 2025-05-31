import { ApiProperty } from '@nestjs/swagger'; // Import ApiProperty
import { UserResponseDto } from './user-response.dto'; // Adjust path as needed

export class PaginatedUsersResponseDto {
  @ApiProperty({
    type: [UserResponseDto], // Specifies that this is an array of UserResponseDto
    description: 'Array of user data objects for the current page.',
  })
  data: UserResponseDto[];

  @ApiProperty({
    type: Number,
    description: 'Total number of users matching the query.',
    example: 100,
  })
  total: number;

  @ApiProperty({
    type: Number,
    description: 'Current page number (1-indexed).',
    example: 1,
  })
  page: number;

  @ApiProperty({
    type: Number,
    description: 'Number of items per page.',
    example: 10,
  })
  limit: number;
}

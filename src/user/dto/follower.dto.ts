// src/user/dto/follower.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class FollowerDto {
  @ApiProperty({ example: 'u12345' })
  id: string;

  @ApiProperty({ example: 'alice' })
  username: string;

  @ApiProperty({ example: 'Alice Smith', nullable: true })
  full_name: string | null;

  @ApiProperty({
    nullable: true,
  })
  profile_picture_url: string | null;
}
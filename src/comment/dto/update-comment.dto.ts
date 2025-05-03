// src/comment/dto/update-comment.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommentDto {
  @ApiProperty({
    description: 'New content for the comment',
    example: 'I’ve updated my thoughts here.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}

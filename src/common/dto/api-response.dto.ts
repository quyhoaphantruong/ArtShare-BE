import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({
    example: true,
    description: 'Indicates if the request was successful.',
  })
  success: boolean;

  @ApiProperty({
    example: 'Operation completed successfully.',
    description: 'A message describing the outcome.',
  })
  message: string;

  @ApiProperty({ example: 200, description: 'HTTP status code.' })
  statusCode: number;

  @ApiProperty({
    required: false,
    description: 'The data payload of the response, if any.',
  })
  data?: T;

  constructor(success: boolean, message: string, statusCode: number, data?: T) {
    this.success = success;
    this.message = message;
    this.statusCode = statusCode;
    this.data = data;
  }
}

export class FollowUnfollowDataDto {
  @ApiProperty()
  followerId: string;

  @ApiProperty()
  followingId: string;
}
export class FollowUserResponseDto extends ApiResponseDto<FollowUnfollowDataDto> {}
export class UnfollowUserResponseDto extends ApiResponseDto<FollowUnfollowDataDto> {}

export class MessageDataDto {
  @ApiProperty({ example: 'Some specific data message' })
  detail: string;
}
export class MessageApiResponseDto extends ApiResponseDto<MessageDataDto> {}

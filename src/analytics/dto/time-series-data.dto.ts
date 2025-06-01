import { ApiProperty } from '@nestjs/swagger';

export class TimePointDto {
  @ApiProperty({
    example: '2023-10-26',
    description: 'Date or time point label',
  })
  date: string;

  @ApiProperty({
    example: 150,
    description: 'Cumulative count at this time point',
  })
  count: number;
}

export class TimeSeriesDataDto {
  @ApiProperty({
    type: [TimePointDto],
    description: 'Array of time points with counts',
  })
  data: TimePointDto[];
}

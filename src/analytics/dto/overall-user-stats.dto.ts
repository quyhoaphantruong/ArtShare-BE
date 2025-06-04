import { ApiProperty } from '@nestjs/swagger';

export class OverallUserStatsDto {
  @ApiProperty({
    example: 1500,
    description: 'Total number of registered users',
  })
  totalUsers: number;

  @ApiProperty({
    example: 50,
    description: 'Number of new users in the last 30 days',
  })
  newUsersLast30Days: number;

  @ApiProperty({
    example: 1200,
    description: 'Total number of users who completed onboarding',
  })
  onboardedUsers: number;

  @ApiProperty({
    example: 80,
    description: 'Percentage of users who completed onboarding',
  })
  onboardingCompletionRate: number;
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { CurrentUser } from 'src/auth/decorators/users.decorator';
import { SubscriptionInfoResponseDto } from './dto/response/subscription-info.dto';

@Controller('subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
  ) { }

  @Get('info')
  async getSubscriptionInfo(
    @CurrentUser() user: CurrentUserType,
  ): Promise<SubscriptionInfoResponseDto>  {
    return this.subscriptionService.getSubscriptionInfo(user.id);
  }
}

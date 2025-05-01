import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SharesService } from './shares.service';
import { CreateShareDto } from './dto/request/create-share.dto';
import { CurrentUser } from 'src/auth/decorators/users.decorator';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('shares')
@UseGuards(JwtAuthGuard)
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post()
  async createShare(
    @Body() createShareDto: CreateShareDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.sharesService.createShare(createShareDto, user.id);
  }
}

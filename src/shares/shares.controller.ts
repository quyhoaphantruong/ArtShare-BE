import { Controller, Post, Body, Delete, UseGuards } from '@nestjs/common';
import { SharesService } from './shares.service';
import { CreateShareDto } from './dto/create-share.dto';
import { RemoveShareDto } from './dto/remove-share.dto';
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

  @Delete()
  async removeShare(
    @Body() removeShareDto: RemoveShareDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.sharesService.removeShare(removeShareDto, user.id);
  }
}

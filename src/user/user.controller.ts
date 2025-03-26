import {
  Controller,
  Get,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/users.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(@CurrentUser() user: any): Promise<User[] | null> {
    console.log('user extracted from auth guard', user);
    return this.userService.findAll();
  }

  // Cập nhật thông tin người dùng
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    updateUserDto: {
      full_name?: string;
      bio?: string;
      profile_picture_url?: string;
    },
  ): Promise<User> {
    return this.userService.updateUser(id, updateUserDto);
  }

  // Xoá người dùng
  @Delete('delete')
  async remove(): Promise<any> {
    return this.userService.deleteUser();
  }
}

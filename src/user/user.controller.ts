import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(): Promise<User[] | null> {
    return this.userService.findAll();
  }

  // Tạo mới người dùng
  @Post('create')
  async create(
    @Body()
    createUserDto: {
      email: string;
      password_hash: string;
      username: string;
    },
  ): Promise<User> {
    return this.userService.createUser(createUserDto);
  }

  // Cập nhật thông tin người dùng
  @Put(':id')
  async update(
    @Param('id') id: number,
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

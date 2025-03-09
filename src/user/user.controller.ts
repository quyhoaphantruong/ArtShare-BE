import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '@prisma/client';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Lấy tất cả người dùng (hoặc người dùng đầu tiên trong cơ sở dữ liệu)
  @Get()
  async findAll(): Promise<User[] | null> {
    return this.userService.findAll();
  }

  // Tạo mới người dùng
  @Post('create')
  async create(@Body() createUserDto: { email: string; password_hash: string; username: string }): Promise<User> {
    return this.userService.createUser(createUserDto);
  }

  // Cập nhật thông tin người dùng
  @Put(':id')
  async update(@Param('id') id: number, @Body() updateUserDto: { full_name?: string; bio?: string; profile_picture_url?: string }): Promise<User> {
    return this.userService.updateUser(id, updateUserDto);
  }

  // Xoá người dùng
  @Delete('delete')
  async remove(): Promise<any> {
    return this.userService.deleteUser();
  }
}

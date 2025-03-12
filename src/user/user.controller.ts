import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Req,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '@prisma/client';
import { UserProfileDTO } from './dto/user-profile.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { FollowRequestDTO } from './dto/follow-request.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Lấy tất cả người dùng (hoặc người dùng đầu tiên trong cơ sở dữ liệu)
  @Get()
  async findAll(): Promise<User[] | null> {
    return this.userService.findAll();
  }

  @Get('profile')
  async getProfile(@Req() req: any): Promise<UserProfileDTO> {
    // const userId = req.user.id;
    // hiện tại fix cứng, chưa có implement token
    const userId = 10;
    return this.userService.getUserProfile(userId);
  }

  @Put('profile')
  async updateProfile(
    @Req() req: any,
    @Body(new ValidationPipe()) updateUserDto: UpdateUserDTO,
  ) {
    const userId = req.user?.id | 10;
    return this.userService.updateUserProfile(userId, updateUserDto);
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

  // Theo dõi người dùng khác
  @Post(':userId/follow')
  async followUser(
    @Param('userId', ParseIntPipe) userIdToFollow: number,
    @Req() req: any,
  ): Promise<string> {
    // const currentUserId = req.user.id; Lấy thông tin user từ token
    // hiện tại fix cứng, chưa có implement token
    const currentUserId = 10;

    return this.userService.followUser(currentUserId, userIdToFollow);
  }

  // Theo dõi người dùng khác
  @Post(':userId/unfollow')
  async unfollowUser(
    @Param('userId', ParseIntPipe) userIdToUnfollow: number,
    @Req() req: any,
  ): Promise<string> {
    const currentUserId = 10;

    return this.userService.unfollowUser(currentUserId, userIdToUnfollow);
  }
}

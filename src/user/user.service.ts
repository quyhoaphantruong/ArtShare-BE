import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service'; // Import PrismaService
import { User } from '@prisma/client'; // Import User type
import { UserProfileDTO } from './dto/UserProfileDTO';
import { UpdateUserDTO } from './dto/UpdateUserDTO';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // Tạo người dùng mới
  async createUser(data: {
    email: string;
    password_hash: string;
    username: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  // Tìm người dùng theo email
  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  // Get user profile by userID (passed from token)
  async getUserProfile(userId: number): Promise<UserProfileDTO> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        email: true,
        full_name: true,
        profile_picture_url: true,
        bio: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  async updateUserProfile(userId: number, updateUserDto: UpdateUserDTO) {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateUserDto,
        select: {
          username: true,
          email: true,
          full_name: true,
          profile_picture_url: true,
          bio: true,
        },
      });
      return updatedUser;
    } catch (error) {
      // Handle the case where the user is not found, or any other prisma related error.
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      throw error;
    }
  }

  // Lấy thông tin người dùng đầu tiên (findFirst)
  async findAll(): Promise<User[] | null> {
    return this.prisma.user.findMany(); // Hoặc có thể tùy chỉnh để tìm kiếm theo điều kiện khác
  }

  // Cập nhật thông tin người dùng
  async updateUser(id: number, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // Xoá người dùng
  async deleteUser(): Promise<any> {
    return this.prisma.user.deleteMany();
  }
}

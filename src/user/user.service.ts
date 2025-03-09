import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service'; // Import PrismaService
import { User } from '@prisma/client'; // Import User type

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // Tạo người dùng mới
  async createUser(data: { email: string; password_hash: string; username: string }): Promise<User> {
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

  // Lấy thông tin người dùng đầu tiên (findFirst)
  async findAll(): Promise<User[] | null> {
    return this.prisma.user.findMany();  // Hoặc có thể tùy chỉnh để tìm kiếm theo điều kiện khác
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

import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service'; // Import PrismaService
import { User } from '@prisma/client'; // Import User type
import { UserProfileDTO } from './dto/user-profile.dto';
import { DeleteUsersDTO } from './dto/delete-users.dto';
import { UpdateUserDTO } from './dto/update-users.dto';
import { ApiResponse } from 'src/common/api-response';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Role } from 'src/auth/enums/role.enum';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { UserProfileMeDTO } from './dto/get-user-me.dto';
import { FollowerDto } from './dto/follower.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async getUserProfile(
    userId: string,
    currentUser: CurrentUserType,
  ): Promise<UserProfileDTO> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        full_name: true,
        profile_picture_url: true,
        bio: true,
        followers_count: true,
        followings_count: true,
        birthday: true,
        is_onboard: true,
        roles: {
          select: {
            role: {
              select: {
                role_name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const roleNames = user.roles.map(
      (userRole) => userRole.role.role_name as Role,
    );
    let isFollowing = false;
    if (currentUser.id !== user.id) {
      isFollowing =
        (await this.prisma.follow.count({
          where: {
            follower_id: currentUser.id,
            following_id: user.id,
          },
        })) > 0;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      profile_picture_url: user.profile_picture_url,
      bio: user.bio,
      followers_count: user.followers_count,
      followings_count: user.followings_count,
      birthday: user.birthday ?? null,
      roles: roleNames,
      isFollowing,
      is_onboard: user.is_onboard,
    };
  }

  async getUserProfileForMe(
    currentUser: CurrentUserType,
  ): Promise<UserProfileMeDTO> {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        username: true,
        email: true,
        full_name: true,
        profile_picture_url: true,
        bio: true,
        followers_count: true,
        followings_count: true,
        birthday: true,
        is_onboard: true,
        roles: {
          select: {
            role: {
              select: { role_name: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${currentUser.id} not found`);
    }

    const roleNames = user.roles.map((ur) => ur.role.role_name as Role);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      profile_picture_url: user.profile_picture_url,
      bio: user.bio,
      followers_count: user.followers_count,
      followings_count: user.followings_count,
      birthday: user.birthday ?? null,
      roles: roleNames,
      isFollowing: false,
      is_onboard: user.is_onboard,
    };
  }

  async getUserProfileByUsername(
    username: string,
    currentUser: CurrentUserType,
  ): Promise<UserProfileDTO> {
    const record = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!record) {
      throw new NotFoundException(
        `User with username "${username}" not found.`,
      );
    }

    return this.getUserProfile(record.id, currentUser);
  }

  async updateUserProfile(
    userId: string,
    updateUserDto: UpdateUserDTO,
  ): Promise<
    Pick<
      User,
      | 'username'
      | 'email'
      | 'full_name'
      | 'profile_picture_url'
      | 'bio'
      | 'birthday'
    >
  > {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...updateUserDto,
          is_onboard: true,
        },
        select: {
          username: true,
          email: true,
          full_name: true,
          profile_picture_url: true,
          bio: true,
          birthday: true,
          is_onboard: true,
        },
      });
      return updatedUser;
    } catch (error: any) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`User with ID ${userId} not found.`);
        }
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[]).join(', ');
          throw new ConflictException(
            `Duplicate value for field(s): ${target}.`,
          );
        }
      }
      throw new InternalServerErrorException('Could not update user profile.');
    }
  }

  async findAll(): Promise<User[] | null> {
    return this.prisma.user.findMany();
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async deleteUsers(deleteUserDTO: DeleteUsersDTO): Promise<any> {
    return this.prisma.user.deleteMany({
      where: {
        id: {
          in: deleteUserDTO.userIds,
        },
      },
    });
  }

  async deleteUserById(userId: string): Promise<any> {
    return this.prisma.user.delete({
      where: {
        id: userId,
      },
    });
  }

  async followUser(
    followerId: string,
    followingId: string,
  ): Promise<ApiResponse<any>> {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself.');
    }

    const [followerExists, followingExists] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: followerId },
        select: { id: true },
      }),
      this.prisma.user.findUnique({
        where: { id: followingId },
        select: { id: true },
      }),
    ]);

    if (!followerExists || !followingExists) {
      const notFoundUserId = !followerExists ? followerId : followingId;
      throw new NotFoundException(`User with ID ${notFoundUserId} not found.`);
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: followingId,
        },
      },
      select: { follower_id: true },
    });

    if (existingFollow) {
      throw new ConflictException('Already following this user.');
    }

    try {
      await this.prisma.$transaction([
        this.prisma.follow.create({
          data: {
            follower_id: followerId,
            following_id: followingId,
          },
        }),
        this.prisma.user.update({
          where: { id: followerId },
          data: { followings_count: { increment: 1 } },
        }),
        this.prisma.user.update({
          where: { id: followingId },
          data: { followers_count: { increment: 1 } },
        }),
      ]);

      return {
        success: true,
        message: 'Followed successfully.',
        statusCode: HttpStatus.CREATED,
      };
    } catch (error: any) {
      console.error('Follow transaction failed:', error);

      if (error?.code === 'P2002') {
        throw new ConflictException('Already following this user.');
      }

      throw new HttpException(
        'Could not follow user due to a server error.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { cause: error },
      );
    }
  }

  async unfollowUser(
    followerId: string,
    followingId: string,
  ): Promise<ApiResponse<any>> {
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: followingId,
        },
      },
      select: { follower_id: true }, // Select minimal field
    });

    if (!existingFollow) {
      throw new NotFoundException('You are not following this user.');
    }

    try {
      await this.prisma.$transaction([
        this.prisma.follow.delete({
          where: {
            follower_id_following_id: {
              follower_id: followerId,
              following_id: followingId,
            },
          },
        }),
        this.prisma.user.update({
          where: { id: followerId },
          data: { followings_count: { decrement: 1 } },
        }),
        this.prisma.user.update({
          where: { id: followingId },
          data: { followers_count: { decrement: 1 } },
        }),
      ]);

      return {
        success: true,
        message: 'Unfollowed successfully.',
        statusCode: HttpStatus.OK,
      };
    } catch (error: any) {
      console.error('Unfollow transaction failed:', error);

      if (error?.code === 'P2025') {
        throw new NotFoundException('Follow relationship not found to delete.');
      }

      throw new HttpException(
        'Could not unfollow user due to a server error.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { cause: error },
      );
    }
  }

  async getFollowersListByUserId(userId: string): Promise<FollowerDto[]> {
    const follows = await this.prisma.follow.findMany({
      where: { following_id: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_picture_url: true,
          },
        },
      },
    });

    return follows.map((f) => ({
      id: f.follower.id,
      username: f.follower.username,
      full_name: f.follower.full_name,
      profile_picture_url: f.follower.profile_picture_url,
    }));
  }

  async getFollowingsListByUserId(userId: string): Promise<FollowerDto[]> {
    const follows = await this.prisma.follow.findMany({
      where: { follower_id: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_picture_url: true,
          },
        },
      },
    });

    return follows.map((f) => ({
      id: f.follower.id,
      username: f.follower.username,
      full_name: f.follower.full_name,
      profile_picture_url: f.follower.profile_picture_url,
    }));
  }
}

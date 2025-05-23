import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ApiResponse as CustomApiResponse } from 'src/common/api-response';
import {
  FollowUserResponseDto,
  FollowUnfollowDataDto,
  UnfollowUserResponseDto,
} from 'src/common/dto/api-response.dto';
import { FollowerDto } from './dto/follower.dto';

@Injectable()
export class UserFollowService {
  private readonly logger = new Logger(UserFollowService.name);

  constructor(private prisma: PrismaService) {}

  async followUser(
    followerId: string,
    followingId: string,
  ): Promise<CustomApiResponse<FollowUnfollowDataDto>> {
    if (followerId === followingId)
      throw new BadRequestException('Cannot follow yourself.');

    const [followerExists, followingExists] = await Promise.all([
      this.prisma.user.count({ where: { id: followerId } }),
      this.prisma.user.count({ where: { id: followingId } }),
    ]);

    if (followerExists === 0)
      throw new NotFoundException(
        `User (follower) with ID ${followerId} not found.`,
      );
    if (followingExists === 0)
      throw new NotFoundException(
        `User (to follow) with ID ${followingId} not found.`,
      );

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: followingId,
        },
      },
    });
    if (existingFollow)
      throw new ConflictException('Already following this user.');

    try {
      await this.prisma.$transaction([
        this.prisma.follow.create({
          data: { follower_id: followerId, following_id: followingId },
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
      const responseData: FollowUnfollowDataDto = { followerId, followingId };
      return new FollowUserResponseDto(
        true,
        'Followed successfully.',
        HttpStatus.CREATED,
        responseData,
      );
    } catch (error: any) {
      this.logger.error(
        `Follow transaction failed for ${followerId} -> ${followingId}:`,
        error,
      );
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Already following this user (race condition).',
        );
      throw new InternalServerErrorException('Could not follow user.');
    }
  }

  async unfollowUser(
    followerId: string,
    followingId: string,
  ): Promise<CustomApiResponse<FollowUnfollowDataDto>> {
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: followingId,
        },
      },
    });
    if (!existingFollow)
      throw new NotFoundException('You are not following this user.');

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
      const responseData: FollowUnfollowDataDto = { followerId, followingId };
      return new UnfollowUserResponseDto(
        true,
        'Unfollowed successfully.',
        HttpStatus.OK,
        responseData,
      );
    } catch (error: any) {
      this.logger.error(
        `Unfollow transaction failed for ${followerId} -> ${followingId}:`,
        error,
      );
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        throw new NotFoundException(
          'Follow relationship not found to delete (race condition or invalid state).',
        );

      throw new InternalServerErrorException('Could not unfollow user.');
    }
  }

  async getFollowersListByUserId(userId: string): Promise<FollowerDto[]> {
    const userExists = await this.prisma.user.count({ where: { id: userId } });
    if (userExists === 0) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

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
      orderBy: { created_at: 'desc' },
    });

    return follows
      .map((f) => {
        if (!f.follower) {
          this.logger.warn(
            `Follow record for following_id ${userId} is missing follower data. Follower ID: ${f.follower_id}`,
          );
          return null;
        }
        return {
          id: f.follower.id,
          username: f.follower.username,
          full_name: f.follower.full_name,
          profile_picture_url: f.follower.profile_picture_url,
        };
      })
      .filter((follower) => follower !== null) as FollowerDto[];
  }

  async getFollowingsListByUserId(userId: string): Promise<FollowerDto[]> {
    const userExists = await this.prisma.user.count({ where: { id: userId } });
    if (userExists === 0) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const follows = await this.prisma.follow.findMany({
      where: { follower_id: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_picture_url: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return follows
      .map((f) => {
        if (!f.following) {
          this.logger.warn(
            `Follow record for follower_id ${userId} is missing 'following' data. Following ID: ${f.following_id}`,
          );
          return null;
        }
        return {
          id: f.following.id,
          username: f.following.username,
          full_name: f.following.full_name,
          profile_picture_url: f.following.profile_picture_url,
        };
      })
      .filter((followingUser) => followingUser !== null) as FollowerDto[];
  }
}

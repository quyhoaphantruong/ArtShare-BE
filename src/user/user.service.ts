import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User, UserAccess, Prisma } from '@prisma/client';
import { UserProfileDTO } from './dto/user-profile.dto';
import { DeleteUsersDTO } from './dto/delete-users.dto';
import { UpdateUserDTO } from './dto/update-users.dto';
import { ApiResponse as CustomApiResponse } from 'src/common/api-response';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Role } from 'src/auth/enums/role.enum';
import { CreateUserAdminDTO } from './dto/create-user-admin.dto';
import { UpdateUserAdminDTO } from './dto/update-user-admin.dto';
import { Auth } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';
import { FirebaseError } from 'firebase-admin';
import { UserResponseDto } from './dto/user-response.dto';
import {
  FollowUserResponseDto,
  FollowUnfollowDataDto,
  UnfollowUserResponseDto,
} from 'src/common/response/api-response.dto';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { UserProfileMeDTO } from './dto/get-user-me.dto';
import { FollowerDto } from './dto/follower.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  private mapUserToUserResponseDto(
    userWithRelations: User & {
      roles: Array<{ role: { role_name: string } }>;
      userAccess: UserAccess | null;
      followers_count: number;
      followings_count: number;
    },
  ): UserResponseDto {
    return {
      id: userWithRelations.id,
      email: userWithRelations.email,
      username: userWithRelations.username,
      fullName: userWithRelations.full_name,
      profilePictureUrl: userWithRelations.profile_picture_url,
      bio: userWithRelations.bio,
      createdAt: userWithRelations.created_at,
      updatedAt: userWithRelations.updated_at,
      birthday: userWithRelations.birthday,
      followersCount: userWithRelations.followers_count,
      followingsCount: userWithRelations.followings_count,
      roles: userWithRelations.roles.map((ur) => ur.role.role_name as Role),
    };
  }

  constructor(
    private prisma: PrismaService,
    private readonly firebaseAuth: Auth,
  ) {}

  async findAllWithDetails(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      include: {
        roles: { include: { role: true } },
        userAccess: true,
      },
      orderBy: { created_at: 'desc' },
    });
    return users
      .map((user) => this.mapUserToUserResponseDto(user))
      .filter((dto) => dto !== null) as UserResponseDto[];
  }

  async findOneByIdWithDetails(
    userId: string,
  ): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        userAccess: true,
      },
    });

    if (!user) {
      return null;
    }
    return this.mapUserToUserResponseDto(user);
  }

  async createUserByAdmin(dto: CreateUserAdminDTO): Promise<UserResponseDto> {
    const {
      id,
      username,
      email,
      full_name,
      profile_picture_url,
      bio,
      birthday,
      roles: roleNames,
    } = dto;

    const existingUserById = await this.prisma.user.findUnique({
      where: { id },
    });
    if (existingUserById) {
      throw new ConflictException(
        `User with ID (Firebase UID) '${id}' already exists locally.`,
      );
    }

    const [existingUserByEmail, existingUserByUsername] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.user.findUnique({ where: { username } }),
    ]);
    if (existingUserByEmail)
      throw new ConflictException(`Email '${email}' is already in use.`);
    if (existingUserByUsername)
      throw new ConflictException(`Username '${username}' is already in use.`);

    const dbRoles = await this.prisma.role.findMany({
      where: { role_name: { in: roleNames } },
    });
    if (dbRoles.length !== roleNames.length) {
      const foundDbRoleNames = dbRoles.map((r) => r.role_name);
      const missingRoles = roleNames.filter(
        (rName) => !foundDbRoleNames.includes(rName),
      );
      throw new BadRequestException(
        `Invalid roles: ${missingRoles.join(', ')}. Roles do not exist.`,
      );
    }

    try {
      const newUser = await this.prisma.user.create({
        data: {
          id,
          username,
          email,
          full_name: full_name || null,
          profile_picture_url: profile_picture_url || null,
          bio: bio || null,
          birthday: birthday ? new Date(birthday) : null,

          roles: {
            create: dbRoles.map((role) => ({
              role_id: role.role_id,
              assignedAt: new Date(),
            })),
          },
        },
        include: {
          roles: { include: { role: true } },
          userAccess: true,
        },
      });
      const mappedUser = this.mapUserToUserResponseDto(newUser);
      if (!mappedUser) {
        throw new InternalServerErrorException(
          'Failed to map newly created user.',
        );
      }
      return mappedUser;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target =
          (error.meta?.target as string[])?.join(', ') || 'a unique field';
        throw new ConflictException(
          `A user with this ${target} already exists.`,
        );
      }
      this.logger.error('Error creating user by admin:', error);
      throw new InternalServerErrorException('Could not create user.');
    }
  }

  async updateUserByAdmin(
    userId: string,
    dto: UpdateUserAdminDTO,

    newProfilePictureUrlFromStorage?: string | null,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`Attempted to update non-existent user: ${userId}`);
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    if (dto.email && dto.email !== user.email) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingByEmail && existingByEmail.id !== userId) {
        throw new ConflictException(`Email '${dto.email}' is already in use.`);
      }
    }
    if (dto.username && dto.username !== user.username) {
      const existingByUsername = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });
      if (existingByUsername && existingByUsername.id !== userId) {
        throw new ConflictException(
          `Username '${dto.username}' is already in use.`,
        );
      }
    }

    const dataToUpdate: Prisma.UserUpdateInput = {};

    if (dto.username !== undefined) dataToUpdate.username = dto.username;
    if (dto.email !== undefined) dataToUpdate.email = dto.email;
    if (dto.fullName !== undefined) dataToUpdate.full_name = dto.fullName;
    if (dto.bio !== undefined) dataToUpdate.bio = dto.bio;
    if (dto.birthday !== undefined) {
      // Check if 'birthday' field was part of the request payload
      if (dto.birthday === null || dto.birthday === '') {
        // Client explicitly wants to clear the birthday
        dataToUpdate.birthday = null;
      } else {
        // Attempt to parse the date string.
        // The @IsDateString validator in the DTO should have already checked its basic format.
        const dateObj = new Date(dto.birthday);
        // Perform an additional check for validity, as new Date() can be lenient.
        // getTime() on an invalid Date object returns NaN.
        if (isNaN(dateObj.getTime())) {
          throw new BadRequestException(
            `Invalid date format for birthday: "${dto.birthday}". Please use YYYY-MM-DD.`,
          );
        }
        dataToUpdate.birthday = dateObj; // Prisma expects a Date object or null for DateTime fields
      }
    }
    if (newProfilePictureUrlFromStorage !== undefined) {
      dataToUpdate.profile_picture_url = newProfilePictureUrlFromStorage;
    }

    if (dto.roles) {
      const dbRoles = await this.prisma.role.findMany({
        where: { role_name: { in: dto.roles as string[] } },
      });

      if (dbRoles.length !== dto.roles.length) {
        const foundDbRoleNames = dbRoles.map((r) => r.role_name);
        const missingRoles = dto.roles.filter(
          (rName) => !foundDbRoleNames.includes(rName),
        );
        throw new BadRequestException(
          `Invalid roles provided for update: ${missingRoles.join(', ')}. Ensure roles exist.`,
        );
      }

      dataToUpdate.roles = {
        deleteMany: {},
        create: dbRoles.map((role) => ({
          role_id: role.role_id,
          assignedAt: new Date(),
        })),
      };
    }

    if (Object.keys(dataToUpdate).length === 0 && !dto.roles) {
      this.logger.log(
        `Update request for user ${userId} with no actual changes.`,
      );

      const currentUserData = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } }, userAccess: true },
      });
      if (!currentUserData)
        throw new NotFoundException(`User with ID ${userId} not found.`);
      return this.mapUserToUserResponseDto(currentUserData);
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
        include: {
          roles: { include: { role: true } },
          userAccess: true,
        },
      });
      return this.mapUserToUserResponseDto(updatedUser);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target =
          (error.meta?.target as string[])?.join(', ') || 'a unique field';
        throw new ConflictException(
          `A user with this ${target} already exists (possibly due to a race condition).`,
        );
      }
      this.logger.error(`Error updating user ${userId} by admin:`, error);
      throw new InternalServerErrorException(
        'Could not update user information.',
      );
    }
  }

  async getUserForUpdate(
    userId: string,
  ): Promise<{ id: string; profilePictureUrl: string | null } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, profile_picture_url: true },
    });
    if (!user) return null;
    return { id: user.id, profilePictureUrl: user.profile_picture_url };
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
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!currentUser)
        throw new NotFoundException(`User with ID ${userId} not found.`);

      if (updateUserDto.email && updateUserDto.email !== currentUser.email) {
        const emailConflict = await this.prisma.user.findUnique({
          where: { email: updateUserDto.email },
        });
        if (emailConflict && emailConflict.id !== userId) {
          throw new ConflictException(
            `Email '${updateUserDto.email}' is already in use.`,
          );
        }
      }
      if (
        updateUserDto.username &&
        updateUserDto.username !== currentUser.username
      ) {
        const usernameConflict = await this.prisma.user.findUnique({
          where: { username: updateUserDto.username },
        });
        if (usernameConflict && usernameConflict.id !== userId) {
          throw new ConflictException(
            `Username '${updateUserDto.username}' is already in use.`,
          );
        }
      }

      const dataToUpdate: Prisma.UserUpdateInput = {};
      if (updateUserDto.username !== undefined)
        dataToUpdate.username = updateUserDto.username;
      if (updateUserDto.email !== undefined)
        dataToUpdate.email = updateUserDto.email;
      if (updateUserDto.full_name !== undefined)
        dataToUpdate.full_name = updateUserDto.full_name;
      if (updateUserDto.profile_picture_url !== undefined)
        dataToUpdate.profile_picture_url = updateUserDto.profile_picture_url;
      if (updateUserDto.bio !== undefined) dataToUpdate.bio = updateUserDto.bio;
      if (updateUserDto.birthday !== undefined) {
        dataToUpdate.birthday = updateUserDto.birthday
          ? new Date(updateUserDto.birthday)
          : null;
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { ...dataToUpdate, is_onboard: true },

        select: {
          id: true,
          username: true,
          email: true,
          full_name: true,
          profile_picture_url: true,
          bio: true,
          birthday: true,
          is_onboard: true,
          followers_count: true,
          followings_count: true,
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

      return updatedUser;
    } catch (error: any) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025')
          throw new NotFoundException(`User with ID ${userId} not found.`);
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[]).join(', ');
          throw new ConflictException(
            `Duplicate value for field(s): ${target}.`,
          );
        }
      }
      if (error instanceof HttpException) throw error;
      this.logger.error(`Could not update user profile for ${userId}:`, error);
      throw new InternalServerErrorException('Could not update user profile.');
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async deleteUserById(userId: string): Promise<{
    message: string;
    firebaseDeleted: boolean;
    dbDeleted: boolean;
  }> {
    let firebaseUserFoundAndDeleted = false;
    let dbUserFoundAndDeleted = false;

    try {
      await this.firebaseAuth.deleteUser(userId);
      firebaseUserFoundAndDeleted = true;
      this.logger.log(`User ${userId} successfully deleted from Firebase.`);
    } catch (error: any) {
      const firebaseError = error as FirebaseError;
      if (firebaseError.code === 'auth/user-not-found') {
        this.logger.warn(
          `User ${userId} not found in Firebase. Proceeding with DB deletion.`,
        );
      } else {
        this.logger.error(
          `Firebase error deleting user ${userId}: ${firebaseError.message}`,
          firebaseError.stack,
        );
        throw new InternalServerErrorException(
          `Failed to delete user ${userId} from Firebase: ${firebaseError.message}. DB deletion not attempted.`,
        );
      }
    }

    try {
      await this.prisma.user.delete({ where: { id: userId } });
      dbUserFoundAndDeleted = true;
      this.logger.log(`User ${userId} successfully deleted from Prisma DB.`);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(`User ${userId} not found in Prisma DB (P2025).`);
      } else {
        this.logger.error(`Prisma error deleting user ${userId}:`, error);
        const firebaseMessage = firebaseUserFoundAndDeleted
          ? 'Firebase deletion succeeded.'
          : 'User not found in Firebase or Firebase deletion failed.';
        throw new InternalServerErrorException(
          `Failed to delete user ${userId} from Prisma DB. ${firebaseMessage} Prisma error: ${(error as Error).message}`,
        );
      }
    }

    if (firebaseUserFoundAndDeleted && dbUserFoundAndDeleted) {
      return {
        message: `User with ID ${userId} deleted successfully from Firebase and DB.`,
        firebaseDeleted: true,
        dbDeleted: true,
      };
    } else if (firebaseUserFoundAndDeleted && !dbUserFoundAndDeleted) {
      return {
        message: `User with ID ${userId} deleted from Firebase, but was not found/already deleted from DB.`,
        firebaseDeleted: true,
        dbDeleted: false,
      };
    } else if (!firebaseUserFoundAndDeleted && dbUserFoundAndDeleted) {
      return {
        message: `User with ID ${userId} deleted from DB, but was not found in Firebase.`,
        firebaseDeleted: false,
        dbDeleted: true,
      };
    } else {
      throw new NotFoundException(
        `User with ID ${userId} not found in Firebase and/or DB.`,
      );
    }
  }

  async deleteMultipleUsers(deleteUsersDTO: DeleteUsersDTO): Promise<{
    message: string;
    firebase: {
      successCount: number;
      failureCount: number;
      errors: Array<{
        index: number;
        uid: string;
        reason: string;
        code?: string;
      }>;
    };
    prisma: { deletedCount: number; requestedCount: number };
  }> {
    const { userIds } = deleteUsersDTO;

    if (!userIds || userIds.length === 0) {
      return {
        message: 'No user IDs provided for deletion.',
        firebase: { successCount: 0, failureCount: 0, errors: [] },
        prisma: { deletedCount: 0, requestedCount: 0 },
      };
    }
    this.logger.log(
      `Attempting to delete ${userIds.length} users: [${userIds.join(', ')}]`,
    );

    let firebaseResult: admin.auth.DeleteUsersResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
    };
    const firebaseErrorsFormatted: Array<{
      index: number;
      uid: string;
      reason: string;
      code?: string;
    }> = [];

    if (userIds.length > 0) {
      try {
        firebaseResult = await this.firebaseAuth.deleteUsers(userIds);
        this.logger.log(
          `Firebase deleteUsers result: ${firebaseResult.successCount} successes, ${firebaseResult.failureCount} failures.`,
        );
        if (firebaseResult.failureCount > 0) {
          firebaseResult.errors.forEach((errorDetail) => {
            const failedUid = userIds[errorDetail.index];
            firebaseErrorsFormatted.push({
              index: errorDetail.index,
              uid: failedUid,
              reason: errorDetail.error.message,
              code: errorDetail.error.code,
            });
            this.logger.warn(
              `Failed to delete UID ${failedUid} from Firebase (index ${errorDetail.index}): ${errorDetail.error.code} - ${errorDetail.error.message}`,
            );
          });
        }
      } catch (error: any) {
        const firebaseError = error as FirebaseError;
        this.logger.error(
          `A general error occurred during Firebase deleteUsers: ${firebaseError.message}`,
          firebaseError.stack,
        );
        throw new InternalServerErrorException(
          `A general error occurred with Firebase while trying to delete multiple users. Error: ${firebaseError.message}. DB deletion not attempted.`,
        );
      }
    }

    let prismaDeletedCount = 0;
    try {
      const { count } = await this.prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
      prismaDeletedCount = count;
      this.logger.log(
        `Prisma deleted ${prismaDeletedCount} users from DB out of ${userIds.length} requested.`,
      );
    } catch (error) {
      this.logger.error(
        `Prisma error during deleteMany for UIDs ${userIds.join(', ')}:`,
        error,
      );
      throw new InternalServerErrorException(
        `Failed to delete users from Prisma DB. Firebase deletions: ${firebaseResult.successCount} succeeded, ${firebaseResult.failureCount} failed. Prisma error: ${(error as Error).message}`,
      );
    }

    let summaryMessage = `Processed deletion for ${userIds.length} user IDs. `;
    summaryMessage += `Firebase: ${firebaseResult.successCount} deleted, ${firebaseResult.failureCount} failed. `;
    summaryMessage += `Prisma DB: ${prismaDeletedCount} deleted.`;
    if (firebaseResult.failureCount > 0)
      summaryMessage += ` Check 'firebase.errors' for details on Firebase failures.`;
    if (
      prismaDeletedCount < userIds.length &&
      prismaDeletedCount <
        userIds.length -
          firebaseErrorsFormatted.filter(
            (e) => e.code !== 'auth/user-not-found',
          ).length
    ) {
      summaryMessage += ` Some users requested for DB deletion might not have been found or an error occurred.`;
    }

    return {
      message: summaryMessage,
      firebase: {
        successCount: firebaseResult.successCount,
        failureCount: firebaseResult.failureCount,
        errors: firebaseErrorsFormatted,
      },
      prisma: {
        deletedCount: prismaDeletedCount,
        requestedCount: userIds.length,
      },
    };
  }

  async followUser(
    followerId: string,
    followingId: string,
  ): Promise<CustomApiResponse<any>> {
    if (followerId === followingId)
      throw new BadRequestException('Cannot follow yourself.');
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
    if (!followerExists)
      throw new NotFoundException(
        `User (follower) with ID ${followerId} not found.`,
      );
    if (!followingExists)
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
      this.logger.error('Follow transaction failed:', error);
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
  ): Promise<CustomApiResponse<any>> {
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
      this.logger.error('Unfollow transaction failed:', error);
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        throw new NotFoundException('Follow relationship not found to delete.');
      throw new InternalServerErrorException('Could not unfollow user.');
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

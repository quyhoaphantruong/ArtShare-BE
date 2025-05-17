import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Patch,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Logger,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserProfileDTO } from './dto/user-profile.dto';
import { DeleteUsersDTO } from './dto/delete-users.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/users.decorator';
import { UpdateUserDTO } from './dto/update-users.dto';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { Roles } from 'src/auth/decorators/roles.decorators';
import { Role } from 'src/auth/enums/role.enum';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UpdateUserAdminDTO } from './dto/update-user-admin.dto';
import { CreateUserAdminDTO } from './dto/create-user-admin.dto';
import {
  DeleteMultipleUsersResponseDto,
  DeleteUserByIdResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';
import {
  FollowUserResponseDto,
  UnfollowUserResponseDto,
} from 'src/common/response/api-response.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from 'src/storage/storage.service';
import { Readable } from 'stream';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly storageService: StorageService,
  ) {}

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ADMIN - Get all users with details' })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'List of all users with their details.',
    type: [UserResponseDto],
  })
  @SwaggerApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource. Admin role required.',
  })
  async adminFindAllUsers(): Promise<UserResponseDto[]> {
    return this.userService.findAllWithDetails();
  }

  @Post('admin/create')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'ADMIN - Create a new user (expects Firebase UID)' })
  @ApiBody({ type: CreateUserAdminDTO })
  @SwaggerApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully by admin.',
    type: UserResponseDto,
  })
  @SwaggerApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request (e.g., validation error, missing roles).',
  })
  @SwaggerApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource. Admin role required.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Conflict (e.g., user ID, email, or username already exists).',
  })
  async adminCreateUser(
    @Body() createUserAdminDto: CreateUserAdminDTO,
  ): Promise<UserResponseDto> {
    return this.userService.createUserByAdmin(createUserAdminDto);
  }

  @Get('admin/:userId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ADMIN - Get user by ID with details' })
  @ApiParam({
    name: 'userId',
    description: 'The ID of the user to retrieve',
    type: String,
  })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'User details.',
    type: UserResponseDto,
  })
  @SwaggerApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource. Admin role required.',
  })
  async adminFindOneUser(
    @Param('userId') userId: string,
  ): Promise<UserResponseDto> {
    const user = await this.userService.findOneByIdWithDetails(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }
    return user;
  }

  @Patch('admin/:userId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "ADMIN - Update user's profile or roles (does NOT update UserAccess/subscription)",
  })
  @ApiParam({
    name: 'userId',
    description: 'The ID of the user to update',
    type: String,
  })
  @ApiBody({ type: UpdateUserAdminDTO })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully by admin.',
    type: UserResponseDto,
  })
  @SwaggerApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request (e.g., invalid roles, validation error).',
  })
  @SwaggerApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource. Admin role required.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Conflict (e.g., email or username taken by another user).',
  })
  @UseInterceptors(
    FileInterceptor('profilePictureFile', {
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return callback(
            new BadRequestException(
              'Only image files (jpg, jpeg, png, gif, webp) are allowed!',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 1024 * 1024 * 5,
      },
    }),
  )
  async adminUpdateUser(
    @Param('userId') userId: string,
    @Body() updateUserAdminDto: UpdateUserAdminDTO,
    @UploadedFile() profilePictureFile?: Express.Multer.File,
  ): Promise<UserResponseDto> {
    let finalProfilePictureUrl: string | null | undefined = undefined;

    if (profilePictureFile) {
      const uploadResults = await this.storageService.uploadFiles(
        [profilePictureFile],
        `users/${userId}/profile-pictures`,
      );
      if (uploadResults && uploadResults.length > 0 && uploadResults[0].url) {
        finalProfilePictureUrl = uploadResults[0].url;
      }
    } else if (
      updateUserAdminDto.profilePictureUrl &&
      updateUserAdminDto.profilePictureUrl.startsWith('data:image')
    ) {
      this.logger.log(
        `Processing Data URI for profile picture for user ${userId}`,
      );
      const parts = updateUserAdminDto.profilePictureUrl.split(',');
      if (parts.length !== 2 || !parts[0].startsWith('data:image')) {
        throw new BadRequestException(
          'Invalid Data URI format for profile picture.',
        );
      }
      const meta = parts[0];
      const base64Data = parts[1];

      const buffer = Buffer.from(base64Data, 'base64');

      let mimetype = 'application/octet-stream';
      let extension = 'bin';
      const mimeMatch = meta.match(/^data:(image\/[a-zA-Z+]+);base64$/);
      if (mimeMatch && mimeMatch[1]) {
        mimetype = mimeMatch[1];
        extension = mimetype.split('/')[1] || extension;
        if (extension === 'svg+xml') extension = 'svg';
      }

      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const tempFileObject: Express.Multer.File = {
        fieldname: 'profilePictureFromDataUri',
        originalname: `profile-${userId}-${Date.now()}.${extension}`,
        encoding: 'base64',
        mimetype: mimetype,
        buffer: buffer,
        size: buffer.length,
        stream: stream,
        destination: '',
        filename: '',
        path: '',
      };

      try {
        const uploadResults = await this.storageService.uploadFiles(
          [tempFileObject],
          `users/${userId}/profile-pictures`,
        );
        if (uploadResults && uploadResults.length > 0 && uploadResults[0].url) {
          finalProfilePictureUrl = uploadResults[0].url;

          this.logger.log(
            `Data URI uploaded for user ${userId}. URL: ${finalProfilePictureUrl}`,
          );
        } else {
          this.logger.error(
            `Failed to upload Data URI for user ${userId} or no URL returned.`,
          );
        }
      } catch (uploadError) {
        this.logger.error(
          `Error uploading Data URI for user ${userId}:`,
          uploadError,
        );
        throw new InternalServerErrorException(
          'Failed to process profile picture from Data URI.',
        );
      }
    } else if (
      updateUserAdminDto.hasOwnProperty('profilePictureUrl') &&
      updateUserAdminDto.profilePictureUrl === null
    ) {
      finalProfilePictureUrl = null;
    }

    return this.userService.updateUserByAdmin(
      userId,
      updateUserAdminDto,
      finalProfilePictureUrl,
    );
  }

  @Delete('admin/multiple')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ADMIN - Delete multiple users by IDs' })
  @ApiBody({ type: DeleteUsersDTO })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description:
      'Users deletion process completed. Check response for details.',
    type: DeleteMultipleUsersResponseDto,
  })
  @SwaggerApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data (e.g., empty userIds array).',
  })
  @SwaggerApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource. Admin role required.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error during deletion.',
  })
  async adminDeleteMultipleUsers(
    @Body() deleteUsersDTO: DeleteUsersDTO,
  ): Promise<DeleteMultipleUsersResponseDto> {
    return this.userService.deleteMultipleUsers(deleteUsersDTO);
  }

  @Delete('admin/:userId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ADMIN - Delete user by ID' })
  @ApiParam({
    name: 'userId',
    description: 'The ID of the user to delete',
    type: String,
  })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'User deletion status.',
    type: DeleteUserByIdResponseDto,
  })
  @SwaggerApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found in either Firebase or Database.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource. Admin role required.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error during deletion.',
  })
  async adminDeleteUserById(
    @Param('userId' /*, new ParseUUIDPipe() */) userId: string,
  ): Promise<DeleteUserByIdResponseDto> {
    return this.userService.deleteUserById(userId);
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'Profile of the current user.',
    type: UserProfileDTO,
  })
  @SwaggerApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. User not logged in.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User profile not found.',
  })
  async getCurrentUserProfile(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<UserProfileDTO> {
    return this.userService.getUserProfile(currentUser.id);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current logged-in user profile' })
  @ApiBody({ type: UpdateUserDTO })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'Current user profile updated successfully.',
    type: UserProfileDTO,
  })
  @SwaggerApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request (e.g., validation error).',
  })
  @SwaggerApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. User not logged in.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User profile not found.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Conflict (e.g., email or username taken).',
  })
  async updateCurrentUserProfile(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() updateUserDto: UpdateUserDTO,
  ): Promise<UserProfileDTO> {
    return this.userService.updateUserProfile(currentUser.id, updateUserDto);
  }

  @Post(':userIdToFollow/follow')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Follow another user' })
  @ApiParam({
    name: 'userIdToFollow',
    description: 'The ID of the user to follow',
    type: String,
  })
  @SwaggerApiResponse({
    status: HttpStatus.CREATED,
    description: 'Successfully followed the user.',
    type: FollowUserResponseDto,
  })
  @SwaggerApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot follow yourself or invalid input.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User to follow or current user not found.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Already following this user.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. User not logged in.',
  })
  async followUser(
    @Param('userIdToFollow') userIdToFollow: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<FollowUserResponseDto> {
    return this.userService.followUser(currentUser.id, userIdToFollow);
  }

  @Post(':userIdToUnfollow/unfollow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow another user' })
  @ApiParam({
    name: 'userIdToUnfollow',
    description: 'The ID of the user to unfollow',
    type: String,
  })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully unfollowed the user.',
    type: UnfollowUserResponseDto,
  })
  @SwaggerApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Not following this user or user not found.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. User not logged in.',
  })
  async unfollowUser(
    @Param('userIdToUnfollow') userIdToUnfollow: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<UnfollowUserResponseDto> {
    return this.userService.unfollowUser(currentUser.id, userIdToUnfollow);
  }
}

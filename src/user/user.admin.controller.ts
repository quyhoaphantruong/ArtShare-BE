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
  Query,
} from '@nestjs/common';
import { DeleteUsersDTO } from './dto/delete-users.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorators';
import { Role } from 'src/auth/enums/role.enum';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { UpdateUserAdminDTO } from './dto/update-user-admin.dto';
import { CreateUserAdminDTO } from './dto/create-user-admin.dto';
import {
  DeleteMultipleUsersResponseDto,
  DeleteUserByIdResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from 'src/storage/storage.service';
import { Readable } from 'stream';
import { UserAdminService } from './user.admin.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';

@ApiTags('Users (Admin)')
@Controller('admin/users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(Role.ADMIN)
export class UserAdminController {
  private readonly logger = new Logger(UserAdminController.name);

  constructor(
    private readonly userAdminService: UserAdminService,
    private readonly storageService: StorageService,
  ) {}

  @Get('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ADMIN - Get all users with details (paginated)' })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of users with their details.',
    type: PaginatedUsersResponseDto,
  })
  @SwaggerApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource. Admin role required.',
  })
  async adminFindAllUsers(
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    return this.userAdminService.findAllWithDetailsPaginated(paginationQuery);
  }

  @Post('create')
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
    return this.userAdminService.createUserByAdmin(createUserAdminDto);
  }

  @Get(':userId')
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
    @Param('userId' /*, new ParseUUIDPipe() if applicable */) userId: string,
  ): Promise<UserResponseDto> {
    const user = await this.userAdminService.findOneByIdWithDetails(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }
    return user;
  }

  @Patch(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "ADMIN - Update user's profile or roles" })
  @ApiParam({
    name: 'userId',
    description: 'The ID of the user to update',
    type: String,
  })
  @ApiConsumes('multipart/form-data')
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
      limits: { fileSize: 1024 * 1024 * 5 },
    }),
  )
  async adminUpdateUser(
    @Param('userId' /*, new ParseUUIDPipe() if applicable */) userId: string,
    @Body() updateUserAdminDto: UpdateUserAdminDTO,
    @UploadedFile() profilePictureFile?: Express.Multer.File,
  ): Promise<UserResponseDto> {
    let finalProfilePictureUrl: string | null | undefined = undefined;

    const userForUpdate = await this.userAdminService.getUserForUpdate(userId);
    if (!userForUpdate) {
      throw new NotFoundException(
        `User with ID ${userId} not found for update.`,
      );
    }

    if (profilePictureFile) {
      this.logger.log(`Uploading new profile picture file for user ${userId}`);
      const uploadResults = await this.storageService.uploadFiles(
        [profilePictureFile],
        `users/${userId}/profile-pictures`,
      );
      if (uploadResults && uploadResults.length > 0 && uploadResults[0].url) {
        finalProfilePictureUrl = uploadResults[0].url;
        this.logger.log(
          `New file uploaded for user ${userId}. URL: ${finalProfilePictureUrl}`,
        );
      } else {
        this.logger.error(
          `File upload failed for user ${userId} or no URL returned.`,
        );
      }
    } else if (updateUserAdminDto.hasOwnProperty('profilePictureUrl')) {
      if (updateUserAdminDto.profilePictureUrl === null) {
        this.logger.log(
          `Setting profile picture to null for user ${userId} as per DTO request.`,
        );
        finalProfilePictureUrl = null;
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
          if (
            uploadResults &&
            uploadResults.length > 0 &&
            uploadResults[0].url
          ) {
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
      }
    }

    return this.userAdminService.updateUserByAdmin(
      userId,
      updateUserAdminDto,
      finalProfilePictureUrl,
    );
  }

  @Delete('multiple')
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
    return this.userAdminService.deleteMultipleUsers(deleteUsersDTO);
  }

  @Delete(':userId')
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
    @Param('userId' /*, new ParseUUIDPipe() if applicable */) userId: string,
  ): Promise<DeleteUserByIdResponseDto> {
    return this.userAdminService.deleteUserById(userId);
  }
}

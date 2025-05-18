import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserProfileDTO } from './dto/user-profile.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/users.decorator';
import { UpdateUserDTO } from './dto/update-users.dto';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  FollowUserResponseDto,
  UnfollowUserResponseDto,
} from 'src/common/dto/api-response.dto';

import { FollowerDto } from './dto/follower.dto';
import { UserFollowService } from './user.follow.service';
import { UserProfileMeDTO } from './dto/get-user-me.dto';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly userFollowService: UserFollowService,
  ) {}

  @Get('profile/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get another user's public profile by ID" })
  @ApiParam({
    name: 'userId',
    description: "The ID of the user's profile to retrieve",
    type: String,
  })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: "User's public profile.",
    type: UserProfileDTO,
  })
  @SwaggerApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. User not logged in.',
  })
  async getPublicUserProfile(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<UserProfileDTO> {
    return this.userService.getUserProfile(userId, currentUser);
  }

  @Get('profile/username/:username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get another user's public profile by username" })
  @ApiParam({
    name: 'username',
    description: "The username of the user's profile to retrieve",
    type: String,
  })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: "User's public profile.",
    type: UserProfileDTO,
  })
  @SwaggerApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. User not logged in.',
  })
  async getPublicUserProfileByUsername(
    @Param('username') username: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<UserProfileDTO> {
    return this.userService.getUserProfileByUsername(username, currentUser);
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'Profile of the current user.',
    type: UserProfileMeDTO,
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
  ): Promise<UserProfileMeDTO> {
    return this.userService.getUserProfileForMe(currentUser);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current logged-in user profile' })
  @ApiBody({ type: UpdateUserDTO })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'Current user profile updated successfully.',
    type: UpdateUserDTO,
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
  ) {
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
    if (userIdToFollow === currentUser.id) {
      throw new BadRequestException('You cannot follow yourself.');
    }
    return this.userFollowService.followUser(currentUser.id, userIdToFollow);
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
    if (userIdToUnfollow === currentUser.id) {
      throw new BadRequestException('You cannot unfollow yourself.');
    }
    return this.userFollowService.unfollowUser(
      currentUser.id,
      userIdToUnfollow,
    );
  }

  @Get(':userId/followers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a user's followers list" })
  @ApiParam({
    name: 'userId',
    description: 'The ID of the user whose followers are to be listed',
    type: String,
  })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: "List of user's followers.",
    type: [FollowerDto],
  })
  @SwaggerApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. User not logged in.',
  })
  async getFollowersList(
    @Param('userId') userId: string,
  ): Promise<FollowerDto[]> {
    return this.userFollowService.getFollowersListByUserId(userId);
  }

  @Get(':userId/followings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a list of users someone is following' })
  @ApiParam({
    name: 'userId',
    description: 'The ID of the user whose followings are to be listed',
    type: String,
  })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'List of users being followed.',
    type: [FollowerDto],
  })
  @SwaggerApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found.',
  })
  @SwaggerApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. User not logged in.',
  })
  async getFollowingsList(
    @Param('userId') userId: string,
  ): Promise<FollowerDto[]> {
    return this.userFollowService.getFollowingsListByUserId(userId);
  }
}

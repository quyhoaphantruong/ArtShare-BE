// src/user/user.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserProfileDTO } from './dto/user-profile.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { DeleteUsersDTO } from './dto/delete-users.dto';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>; // Use jest.Mocked

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            // Mock the entire UserService
            getUserProfile: jest.fn(),
            updateUserProfile: jest.fn(),
            findAll: jest.fn(),
            updateUser: jest.fn(),
            deleteUsers: jest.fn(),
            deleteUserById: jest.fn(),
            followUser: jest.fn(),
            unfollowUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(
      UserService,
    ) as jest.Mocked<UserService>; // Get mocked service
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  it('should get user profile', async () => {
    const mockUserProfile: UserProfileDTO = {
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      profile_picture_url: 'http://example.com/image.jpg',
      bio: 'Test Bio',
    };
    const userId = 1;
    // src/user/user.controller.spec.ts (continued)
    const req = { user: { userId } }; // Mock request object with userId

    userService.getUserProfile.mockResolvedValue(mockUserProfile);

    expect(await controller.getUserProfile(req)).toEqual(mockUserProfile);
    expect(userService.getUserProfile).toHaveBeenCalledWith(userId);
  });

  it('should update user profile', async () => {
    const userId = 1;
    const req = { user: { userId } };
    const updateUserDto: UpdateUserDTO = {
      full_name: 'Updated Name',
      bio: 'Updated Bio',
      profile_picture_url: 'http://example.com/new-image.jpg',
    };
    const mockUpdateUserProfile = {
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Updated Name',
      profile_picture_url: 'http://example.com/new-image.jpg',
      bio: 'Updated Bio',
    };
    userService.updateUserProfile.mockResolvedValue(mockUpdateUserProfile); // Correct usage

    expect(await controller.updateUserProfile(req, updateUserDto)).toEqual(
      mockUpdateUserProfile,
    );
    expect(userService.updateUserProfile).toHaveBeenCalledWith(
      userId,
      updateUserDto,
    );
  });

  it('should get all users', async () => {
    const mockUsers = [
      /* ... array of mock user objects ... */
      {
        id: 1,
        email: 'test1@example.com',
        username: 'testuser1',
        password_hash: 'hash1',
        full_name: 'Test User 1',
        profile_picture_url: null,
        bio: null,
        created_at: new Date(),
        updated_at: null,
        refresh_token: null,
      },
      {
        id: 2,
        email: 'test2@example.com',
        username: 'testuser2',
        password_hash: 'hash2',
        full_name: 'Test User 2',
        profile_picture_url: null,
        bio: null,
        created_at: new Date(),
        updated_at: null,
        refresh_token: null,
      },
    ];
    userService.findAll.mockResolvedValue(mockUsers);

    expect(await controller.findAll()).toEqual(mockUsers);
    expect(userService.findAll).toHaveBeenCalled();
  });
  it('should update a user by ID', async () => {
    const userId = 1;
    const updateData = { full_name: 'Updated Full Name' };
    const updatedUser = {
      /* ... updated user object ... */
    };
    userService.updateUser.mockResolvedValue(updatedUser);

    expect(await controller.updateUser(userId.toString(), updateData)).toBe(
      updatedUser,
    ); //controller.updateUser return updatedUser
    expect(userService.updateUser).toHaveBeenCalledWith(userId, updateData);
  });

  it('should delete users', async () => {
    const deleteUsersDto: DeleteUsersDTO = { userIds: [1, 2] };
    const mockDeleteResult = { count: 2 };

    userService.deleteUsers.mockResolvedValue(mockDeleteResult);

    expect(await controller.deleteUsers(deleteUsersDto)).toEqual(
      mockDeleteResult,
    );
    expect(userService.deleteUsers).toHaveBeenCalledWith(deleteUsersDto);
  });

  it('should delete a user by ID', async () => {
    const userId = '1';
    const mockDeleteResult = { raw: [], affected: 1 };
    userService.deleteUserById.mockResolvedValue(mockDeleteResult);

    expect(await controller.deleteUserById(userId)).toBe(mockDeleteResult);
    expect(userService.deleteUserById).toHaveBeenCalledWith(
      parseInt(userId, 10),
    );
  });

  it('should follow a user', async () => {
    const followerId = 1;
    const followingId = 2;
    const req = { user: { userId: followerId } };
    const mockResult = 'Followed successfully.';

    userService.followUser.mockResolvedValue(mockResult);

    expect(await controller.followUser(req, followingId)).toBe(mockResult);
    expect(userService.followUser).toHaveBeenCalledWith(
      followerId,
      followingId,
    );
  });
  it('should unfollow a user', async () => {
    const followerId = 1;
    const followingId = 2;
    const req = { user: { userId: followerId } };
    const mockResult = 'Unfollowed successfully.';
    userService.unfollowUser.mockResolvedValue(mockResult);

    expect(await controller.unfollowUser(req, followingId)).toBe(mockResult); //unfollowUser must return a string
    expect(userService.unfollowUser).toHaveBeenCalledWith(
      followerId,
      followingId,
    );
  });
});

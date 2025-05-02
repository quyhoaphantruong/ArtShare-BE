import { UserService } from './user.service';
import { User } from '@prisma/client';
import { UserProfileDTO } from './dto/user-profile.dto';
import { DeleteUsersDTO } from './dto/delete-users.dto';
import { UpdateUserDTO } from './dto/update-users.dto';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { ApiResponse } from 'src/common/api-response';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    findAll(): Promise<User[] | null>;
    getProfile(currentUser: CurrentUserType): Promise<UserProfileDTO>;
    updateProfile(currentUser: CurrentUserType, updateUserDto: UpdateUserDTO): Promise<{
        email: string;
        bio: string | null;
        username: string;
        full_name: string | null;
        profile_picture_url: string | null;
    }>;
    deleteUsers(deleteUsersDTO: DeleteUsersDTO): Promise<any>;
    deleteUserById(userId: string): Promise<any>;
    followUser(userIdToFollow: string, currentUser: CurrentUserType): Promise<ApiResponse<any>>;
    unfollowUser(userIdToUnfollow: string, currentUser: CurrentUserType): Promise<ApiResponse<any>>;
}

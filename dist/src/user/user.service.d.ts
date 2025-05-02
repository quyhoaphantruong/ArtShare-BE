import { PrismaService } from '../prisma.service';
import { User } from '@prisma/client';
import { UserProfileDTO } from './dto/user-profile.dto';
import { DeleteUsersDTO } from './dto/delete-users.dto';
import { UpdateUserDTO } from './dto/update-users.dto';
import { ApiResponse } from 'src/common/api-response';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    findUserByEmail(email: string): Promise<User | null>;
    getUserProfile(userId: string): Promise<UserProfileDTO>;
    updateUserProfile(userId: string, updateUserDto: UpdateUserDTO): Promise<{
        email: string;
        bio: string | null;
        username: string;
        full_name: string | null;
        profile_picture_url: string | null;
    }>;
    findAll(): Promise<User[] | null>;
    updateUser(id: string, data: Partial<User>): Promise<User>;
    deleteUsers(deleteUserDTO: DeleteUsersDTO): Promise<any>;
    deleteUserById(userId: string): Promise<any>;
    followUser(followerId: string, followingId: string): Promise<ApiResponse<any>>;
    unfollowUser(followerId: string, followingId: string): Promise<ApiResponse<any>>;
}

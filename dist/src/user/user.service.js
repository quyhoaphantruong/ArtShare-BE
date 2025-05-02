"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let UserService = class UserService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findUserByEmail(email) {
        return this.prisma.user.findUnique({
            where: {
                email,
            },
        });
    }
    async getUserProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                username: true,
                email: true,
                full_name: true,
                profile_picture_url: true,
                bio: true,
                _count: {
                    select: {
                        followings: true,
                        followers: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        return {
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            profile_picture_url: user.profile_picture_url,
            bio: user.bio,
            following_count: user._count?.followings || 0,
            followers_count: user._count?.followers || 0,
        };
    }
    async updateUserProfile(userId, updateUserDto) {
        try {
            const updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data: updateUserDto,
                select: {
                    username: true,
                    email: true,
                    full_name: true,
                    profile_picture_url: true,
                    bio: true,
                },
            });
            return updatedUser;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new common_1.NotFoundException(`User with ID ${userId} not found`);
            }
            throw error;
        }
    }
    async findAll() {
        return this.prisma.user.findMany();
    }
    async updateUser(id, data) {
        return this.prisma.user.update({
            where: { id },
            data,
        });
    }
    async deleteUsers(deleteUserDTO) {
        return this.prisma.user.deleteMany({
            where: {
                id: {
                    in: deleteUserDTO.userIds,
                },
            },
        });
    }
    async deleteUserById(userId) {
        return this.prisma.user.delete({
            where: {
                id: userId,
            },
        });
    }
    async followUser(followerId, followingId) {
        if (followerId === followingId) {
            throw new common_1.BadRequestException('Cannot follow yourself.');
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
            throw new common_1.NotFoundException(`User with ID ${notFoundUserId} not found.`);
        }
        const existingFollow = await this.prisma.follow.findUnique({
            where: {
                follower_id_following_id: {
                    follower_id: followerId,
                    following_id: followingId,
                },
            },
        });
        if (existingFollow) {
            throw new common_1.ConflictException('Already following this user.');
        }
        try {
            await this.prisma.follow.create({
                data: {
                    follower_id: followerId,
                    following_id: followingId,
                },
            });
            return {
                success: true,
                message: 'Followed successfully.',
                statusCode: common_1.HttpStatus.CREATED,
            };
        }
        catch (error) {
            throw new common_1.HttpException('Could not follow user.', common_1.HttpStatus.INTERNAL_SERVER_ERROR, { cause: error });
        }
    }
    async unfollowUser(followerId, followingId) {
        const existingFollow = await this.prisma.follow.findUnique({
            where: {
                follower_id_following_id: {
                    follower_id: followerId,
                    following_id: followingId,
                },
            },
        });
        if (!existingFollow) {
            throw new common_1.NotFoundException('You are not following this user.');
        }
        try {
            await this.prisma.follow.delete({
                where: {
                    follower_id_following_id: {
                        follower_id: followerId,
                        following_id: followingId,
                    },
                },
            });
            return {
                success: true,
                message: 'Unfollowed successfully.',
                statusCode: common_1.HttpStatus.OK,
            };
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new common_1.NotFoundException('Follow relationship not found to delete.');
            }
            throw new common_1.HttpException('Could not unfollow user.', common_1.HttpStatus.INTERNAL_SERVER_ERROR, { cause: error });
        }
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserService);

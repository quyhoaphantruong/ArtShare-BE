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
exports.BlogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const blog_mapping_helper_1 = require("./helpers/blog-mapping.helper");
let BlogService = class BlogService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async applyCommonBlogFilters(baseWhere, requestingUserId, categories) {
        const whereClause = { ...baseWhere };
        if (categories && categories.length > 0) {
            whereClause.categories = {
                some: {
                    name: {
                        in: categories,
                        mode: 'insensitive',
                    },
                },
            };
        }
        return whereClause;
    }
    async getBlogs(take, skip, search) {
        const whereClause = {
            is_published: true,
            is_protected: false,
        };
        if (search) {
            whereClause.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
            ];
        }
        const blogs = await this.prisma.blog.findMany({
            where: whereClause,
            select: blog_mapping_helper_1.blogListItemSelect,
            orderBy: [{ created_at: 'desc' }],
            take: take,
            skip: skip,
        });
        return blogs
            .map(blog_mapping_helper_1.mapBlogToListItemDto)
            .filter((b) => b !== null);
    }
    async findMyBlogs(userId) {
        const blogs = await this.prisma.blog.findMany({
            where: { user_id: userId },
            select: blog_mapping_helper_1.blogListItemSelect,
            orderBy: { created_at: 'desc' },
        });
        return blogs
            .map(blog_mapping_helper_1.mapBlogToListItemDto)
            .filter((b) => b !== null);
    }
    async createBlog(createBlogDto, userId) {
        const userExists = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!userExists) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found.`);
        }
        const newBlog = await this.prisma.blog.create({
            data: {
                ...createBlogDto,
                user_id: userId,
            },
            include: {
                user: {
                    select: { id: true, username: true, profile_picture_url: true },
                },
            },
        });
        const mappedBlog = (0, blog_mapping_helper_1.mapBlogToDetailsDto)(newBlog);
        if (!mappedBlog) {
            console.error(`Failed to map blog details after creation for blog ID: ${newBlog.id}.`);
            throw new common_1.InternalServerErrorException('Failed to process blog details after creation.');
        }
        return mappedBlog;
    }
    async findBlogById(id, requestingUserId) {
        const blog = await this.prisma.blog.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, username: true, profile_picture_url: true },
                },
            },
        });
        if (!blog)
            return null;
        if (blog.is_protected && blog.user_id !== requestingUserId) {
            return null;
        }
        if (!blog.is_published && blog.user_id !== requestingUserId) {
            return null;
        }
        await this.prisma.blog.update({
            where: { id },
            data: { view_count: { increment: 1 } },
        });
        return (0, blog_mapping_helper_1.mapBlogToDetailsDto)(blog);
    }
    async updateBlog(id, updateBlogDto, userId) {
        const existingBlog = await this.prisma.blog.findUnique({
            where: { id },
            select: { user_id: true },
        });
        if (!existingBlog) {
            throw new common_1.NotFoundException(`Blog with ID ${id} not found.`);
        }
        if (existingBlog.user_id !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to update this blog.');
        }
        const updatedBlog = await this.prisma.blog.update({
            where: { id },
            data: { ...updateBlogDto, updated_at: new Date() },
            include: {
                user: {
                    select: { id: true, username: true, profile_picture_url: true },
                },
            },
        });
        const mappedBlog = (0, blog_mapping_helper_1.mapBlogToDetailsDto)(updatedBlog);
        if (!mappedBlog) {
            console.error(`Failed to map blog details after update for blog ID: ${updatedBlog.id}.`);
            throw new common_1.InternalServerErrorException('Failed to process blog details after update.');
        }
        return mappedBlog;
    }
    async deleteBlog(id, userId) {
        const existingBlog = await this.prisma.blog.findUnique({
            where: { id },
            select: { user_id: true },
        });
        if (!existingBlog) {
            throw new common_1.NotFoundException(`Blog with ID ${id} not found.`);
        }
        if (existingBlog.user_id !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to delete this blog.');
        }
        await this.prisma.blog.delete({ where: { id } });
    }
    async getTrendingBlogs(take, skip, categories, requestingUserId) {
        const baseWhere = {
            is_published: true,
            is_protected: false,
        };
        const finalWhere = await this.applyCommonBlogFilters(baseWhere, requestingUserId, categories);
        const blogs = await this.prisma.blog.findMany({
            where: finalWhere,
            select: blog_mapping_helper_1.blogListItemSelect,
            orderBy: [
                { like_count: 'desc' },
                { comment_count: 'desc' },
                { created_at: 'desc' },
            ],
            take: take,
            skip: skip,
        });
        return blogs
            .map(blog_mapping_helper_1.mapBlogToListItemDto)
            .filter((b) => b !== null);
    }
    async getFollowingBlogs(userId, take, skip, categories) {
        const followedUsers = await this.prisma.follow.findMany({
            where: { follower_id: userId },
            select: { following_id: true },
        });
        const followedUserIds = followedUsers.map((f) => f.following_id);
        if (followedUserIds.length === 0)
            return [];
        const baseWhere = {
            user_id: { in: followedUserIds },
            is_published: true,
            is_protected: false,
        };
        const finalWhere = await this.applyCommonBlogFilters(baseWhere, null, categories);
        const blogs = await this.prisma.blog.findMany({
            where: finalWhere,
            select: blog_mapping_helper_1.blogListItemSelect,
            orderBy: { created_at: 'desc' },
            take: take,
            skip: skip,
        });
        return blogs
            .map(blog_mapping_helper_1.mapBlogToListItemDto)
            .filter((b) => b !== null);
    }
    async toggleBookmark(blogId, userId) {
        const blog = await this.prisma.blog.findUnique({
            where: { id: blogId },
            select: {
                id: true,
                is_published: true,
                is_protected: true,
                user_id: true,
            },
        });
        if (!blog ||
            (!blog.is_published && blog.user_id !== userId) ||
            (blog.is_protected && blog.user_id !== userId)) {
            throw new common_1.NotFoundException(`Blog with ID ${blogId} not found or not accessible.`);
        }
        const existingBookmark = await this.prisma.bookmark.findUnique({
            where: { user_id_blog_id: { user_id: userId, blog_id: blogId } },
        });
        if (existingBookmark) {
            await this.prisma.bookmark.delete({
                where: { user_id_blog_id: { user_id: userId, blog_id: blogId } },
            });
            return { bookmarked: false, blogId: blogId };
        }
        else {
            await this.prisma.bookmark.create({
                data: { user_id: userId, blog_id: blogId },
            });
            return { bookmarked: true, blogId: blogId };
        }
    }
    async protectBlog(blogId, userId) {
        const blog = await this.prisma.blog.findUnique({
            where: { id: blogId },
            select: { user_id: true, is_protected: true },
        });
        if (!blog) {
            throw new common_1.NotFoundException(`Blog with ID ${blogId} not found.`);
        }
        if (blog.user_id !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to modify this blog.');
        }
        const newProtectionStatus = !blog.is_protected;
        await this.prisma.blog.update({
            where: { id: blogId },
            data: { is_protected: newProtectionStatus },
        });
        return {
            blogId: blogId,
            protectionStatus: newProtectionStatus ? 'protected' : 'unprotected',
        };
    }
    async rateBlog(blogId, userId, ratingValue) {
        if (ratingValue < 1 || ratingValue > 5) {
            throw new common_1.ForbiddenException('Rating must be between 1 and 5.');
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const blog = await tx.blog.findUnique({
                where: { id: blogId },
                select: { id: true, user_id: true },
            });
            if (!blog) {
                throw new common_1.NotFoundException(`Blog with ID ${blogId} not found.`);
            }
            if (blog.user_id === userId) {
                throw new common_1.ForbiddenException('You cannot rate your own blog.');
            }
            await tx.rating.upsert({
                where: { user_id_blog_id: { user_id: userId, blog_id: blogId } },
                update: { value: ratingValue },
                create: { user_id: userId, blog_id: blogId, value: ratingValue },
            });
            const aggregateResult = await tx.rating.aggregate({
                where: { blog_id: blogId },
                _avg: { value: true },
                _count: { value: true },
            });
            const newAverage = aggregateResult._avg.value ?? 0;
            const newCount = aggregateResult._count.value ?? 0;
            await tx.blog.update({
                where: { id: blogId },
                data: {
                    average_rating: newAverage,
                    rating_count: newCount,
                },
            });
            return { newAverageRating: newAverage, userRating: ratingValue };
        });
        return {
            blogId: blogId,
            newAverageRating: result.newAverageRating,
            userRating: result.userRating,
        };
    }
};
exports.BlogService = BlogService;
exports.BlogService = BlogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BlogService);

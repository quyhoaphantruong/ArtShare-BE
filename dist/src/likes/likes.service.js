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
exports.LikesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
const like_details_dto_1 = require("./dto/response/like-details.dto");
let LikesService = class LikesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createLike(dto, userId) {
        await this.verifyTargetExists(dto.target_id, dto.target_type);
        await this.verifyLikeAlreadyExists(dto, userId);
        const like = await this.prisma.$transaction(async (tx) => {
            const created = await tx.like.create({
                data: {
                    user_id: userId,
                    ...(dto.target_type === client_1.TargetType.POST
                        ? { post_id: dto.target_id }
                        : { blog_id: dto.target_id }),
                },
            });
            if (dto.target_type === client_1.TargetType.POST) {
                await tx.post.update({
                    where: { id: dto.target_id },
                    data: { like_count: { increment: 1 } },
                });
            }
            else {
                await tx.blog.update({
                    where: { id: dto.target_id },
                    data: { like_count: { increment: 1 } },
                });
            }
            return created;
        });
        return (0, class_transformer_1.plainToClass)(like_details_dto_1.LikeDetailsDto, like);
    }
    async removeLike(dto, userId) {
        await this.verifyTargetExists(dto.target_id, dto.target_type);
        await this.verifyLikeNotExists(dto, userId);
        await this.prisma.$transaction(async (tx) => {
            await tx.like.deleteMany({
                where: {
                    user_id: userId,
                    ...(dto.target_type === client_1.TargetType.POST
                        ? { post_id: dto.target_id }
                        : { blog_id: dto.target_id }),
                },
            });
            if (dto.target_type === client_1.TargetType.POST) {
                await tx.post.update({
                    where: { id: dto.target_id },
                    data: { like_count: { decrement: 1 } },
                });
            }
            else {
                await tx.blog.update({
                    where: { id: dto.target_id },
                    data: { like_count: { decrement: 1 } },
                });
            }
        });
        return { success: true };
    }
    async verifyTargetExists(targetId, targetType) {
        if (targetType === client_1.TargetType.POST) {
            const post = await this.prisma.post.findUnique({
                where: { id: targetId },
            });
            if (!post)
                throw new common_1.BadRequestException('Post not found');
        }
        else {
            const blog = await this.prisma.blog.findUnique({
                where: { id: targetId },
            });
            if (!blog)
                throw new common_1.BadRequestException('Blog not found');
        }
    }
    async verifyLikeAlreadyExists(dto, userId) {
        const existing = await this.findLike(dto.target_id, dto.target_type, userId);
        if (existing)
            throw new common_1.BadRequestException('You have already liked this');
    }
    async verifyLikeNotExists(dto, userId) {
        const existing = await this.findLike(dto.target_id, dto.target_type, userId);
        if (!existing)
            throw new common_1.BadRequestException("Can't remove like; none found");
    }
    async findLike(targetId, targetType, userId) {
        if (targetType === client_1.TargetType.POST) {
            return this.prisma.like.findFirst({
                where: { user_id: userId, post_id: targetId },
            });
        }
        else {
            return this.prisma.like.findFirst({
                where: { user_id: userId, blog_id: targetId },
            });
        }
    }
};
exports.LikesService = LikesService;
exports.LikesService = LikesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LikesService);

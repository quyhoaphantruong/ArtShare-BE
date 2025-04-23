import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateLikeDto } from './dto/request/create-like.dto';
import { TargetType } from '@prisma/client';
import { plainToClass } from 'class-transformer';
import { LikeDetailsDto } from './dto/response/like-details.dto';
import { RemoveLikeDto } from './dto/request/remove-like.dto';

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}

  async createLike(
    dto: CreateLikeDto,
    userId: string,
  ): Promise<LikeDetailsDto> {
    await this.verifyTargetExists(dto.target_id, dto.target_type);
    await this.verifyLikeAlreadyExists(dto, userId);

    const like = await this.prisma.$transaction(async (tx) => {
      const created = await tx.like.create({
        data: {
          user_id: userId,
          ...(dto.target_type === TargetType.POST
            ? { post_id: dto.target_id }
            : { blog_id: dto.target_id }),
        },
      });

      if (dto.target_type === TargetType.POST) {
        await tx.post.update({
          where: { id: dto.target_id },
          data: { like_count: { increment: 1 } },
        });
      } else {
        await tx.blog.update({
          where: { id: dto.target_id },
          data: { like_count: { increment: 1 } },
        });
      }

      return created;
    });

    return plainToClass(LikeDetailsDto, like);
  }

  async removeLike(
    dto: RemoveLikeDto,
    userId: string,
  ): Promise<{ success: boolean }> {
    await this.verifyTargetExists(dto.target_id, dto.target_type);
    await this.verifyLikeNotExists(dto, userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.like.deleteMany({
        where: {
          user_id: userId,
          ...(dto.target_type === TargetType.POST
            ? { post_id: dto.target_id }
            : { blog_id: dto.target_id }),
        },
      });

      if (dto.target_type === TargetType.POST) {
        await tx.post.update({
          where: { id: dto.target_id },
          data: { like_count: { decrement: 1 } },
        });
      } else {
        await tx.blog.update({
          where: { id: dto.target_id },
          data: { like_count: { decrement: 1 } },
        });
      }
    });

    return { success: true };
  }

  private async verifyTargetExists(targetId: number, targetType: TargetType) {
    if (targetType === TargetType.POST) {
      const post = await this.prisma.post.findUnique({
        where: { id: targetId },
      });
      if (!post) throw new BadRequestException('Post not found');
    } else {
      const blog = await this.prisma.blog.findUnique({
        where: { id: targetId },
      });
      if (!blog) throw new BadRequestException('Blog not found');
    }
  }

  private async verifyLikeAlreadyExists(dto: CreateLikeDto, userId: string) {
    const existing = await this.findLike(
      dto.target_id,
      dto.target_type,
      userId,
    );
    if (existing) throw new BadRequestException('You have already liked this');
  }

  private async verifyLikeNotExists(dto: RemoveLikeDto, userId: string) {
    const existing = await this.findLike(
      dto.target_id,
      dto.target_type,
      userId,
    );
    if (!existing)
      throw new BadRequestException("Can't remove like; none found");
  }

  private async findLike(
    targetId: number,
    targetType: TargetType,
    userId: string,
  ) {
    if (targetType === TargetType.POST) {
      return this.prisma.like.findFirst({
        where: { user_id: userId, post_id: targetId },
      });
    } else {
      return this.prisma.like.findFirst({
        where: { user_id: userId, blog_id: targetId },
      });
    }
  }
}

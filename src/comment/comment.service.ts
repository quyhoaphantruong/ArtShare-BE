import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment, TargetType } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentDto } from './dto/get-comment.dto';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCommentDto, userId: string): Promise<Comment> {
    const { content, target_id, target_type, parent_comment_id } = dto;

    if (parent_comment_id != null) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: parent_comment_id },
        select: { id: true, target_id: true, target_type: true },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent comment ${parent_comment_id} not found.`,
        );
      }
      if (
        parent.target_id !== target_id ||
        parent.target_type !== target_type
      ) {
        throw new BadRequestException(
          `Cannot reply: parent belongs to a different target.`,
        );
      }
    }

    if (target_type === TargetType.POST) {
      const post = await this.prisma.post.findUnique({
        where: { id: target_id },
      });
      if (!post) {
        throw new NotFoundException(`Post ${target_id} not found.`);
      }
    } else if (target_type === TargetType.BLOG) {
      const blog = await this.prisma.blog.findUnique({
        where: { id: target_id },
      });
      if (!blog) {
        throw new NotFoundException(`Blog ${target_id} not found.`);
      }
    } else {
      throw new BadRequestException(`Invalid target_type: ${target_type}`);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const newComment = await tx.comment.create({
          data: {
            content,
            user_id: userId,
            target_id,
            target_type,
            parent_comment_id,
          },
          include: {
            user: {
              select: { id: true, username: true, profile_picture_url: true },
            },
            replies: {
              select: {
                id: true,
                content: true,
                created_at: true,
                like_count: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    profile_picture_url: true,
                  },
                },
              },
            },
          },
        });
        if (target_type === TargetType.POST) {
          await tx.post.update({
            where: { id: target_id },
            data: { comment_count: { increment: 1 } },
          });
        } else {
          await tx.blog.update({
            where: { id: target_id },
            data: { comment_count: { increment: 1 } },
          });
        }

        return newComment;
      });
    } catch (err: any) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2003') {
          throw new NotFoundException(
            `Related entity not found: ${err.meta?.field_name}`,
          );
        }
      }
      console.error('Create comment failed', { dto, userId, err });
      throw new InternalServerErrorException('Could not create comment.');
    }
  }

  async getComments(
    targetId: number,
    targetType: TargetType,
    currentUserId?: string,
    parentCommentId?: number,
  ): Promise<CommentDto[]> {
    const comments = await this.prisma.comment.findMany({
      where: {
        target_id: targetId,
        target_type: targetType,
        ...(parentCommentId != null && { parent_comment_id: parentCommentId }),
      },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, profile_picture_url: true },
        },
        replies: {
          select: {
            id: true,
            content: true,
            created_at: true,
            user: {
              select: { id: true, username: true, profile_picture_url: true },
            },
          },
        },
      },
    });

    /* ────────── 2. if guest, return immediately ────────── */
    if (!currentUserId || comments.length === 0) {
      return comments.map((c) => ({
        ...c,
        likedByCurrentUser: false,
        replies: c.replies.map((r) => ({
          ...r,
          likedByCurrentUser: false,
        })),
      })) as CommentDto[];
    }

    /* ────────── 3. fetch the user's likes in one query ─── */
    const likedRows = await this.prisma.commentLike.findMany({
      where: {
        user_id: currentUserId,
        comment_id: { in: comments.map((c) => c.id) },
      },
      select: { comment_id: true },
    });
    const likedSet = new Set(likedRows.map((l) => l.comment_id));

    return comments.map((c) => ({
      ...c,
      likedByCurrentUser: likedSet.has(c.id),
      replies: c.replies.map((r) => ({
        ...r,
        likedByCurrentUser: likedSet.has(r.id),
      })),
    })) as CommentDto[];
  }

  async update(
    commentId: number,
    dto: UpdateCommentDto,
    userId: string,
  ): Promise<Comment> {
    const existing = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, user_id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Comment with ID ${commentId} not found.`);
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException(`You cannot edit someone else's comment.`);
    }

    try {
      return await this.prisma.comment.update({
        where: { id: commentId },
        data: {
          content: dto.content,
        },
      });
    } catch (err: any) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException(`Comment with ID ${commentId} not found.`);
      }
      console.error('Error updating comment', { commentId, dto, err });
      throw new InternalServerErrorException('Could not update the comment.');
    }
  }

  async remove(commentId: number, userId: string): Promise<void> {
    const existing = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        user_id: true,
        target_id: true,
        target_type: true,
      },
    });
    if (!existing) {
      throw new NotFoundException(`Comment ${commentId} not found.`);
    }
    if (existing.user_id !== userId) {
      throw new ForbiddenException(`You cannot delete someone else's comment.`);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const deleteResult = await tx.comment.deleteMany({
          where: { parent_comment_id: commentId },
        });
        const repliesRemoved = deleteResult.count;
        await tx.comment.delete({ where: { id: commentId } });

        const totalToDecrement = 1 + repliesRemoved;
        if (existing.target_type === TargetType.POST) {
          await tx.post.update({
            where: { id: existing.target_id },
            data: { comment_count: { decrement: totalToDecrement } },
          });
        } else {
          await tx.blog.update({
            where: { id: existing.target_id },
            data: { comment_count: { decrement: totalToDecrement } },
          });
        }
      });
    } catch (err: any) {
      // If deleteMany / delete missed, Prisma throws P2025
      if (err?.code === 'P2025') {
        throw new NotFoundException(`Comment ${commentId} no longer exists.`);
      }
      console.error('Error deleting comment', { commentId, err });
      throw new InternalServerErrorException('Could not delete the comment.');
    }
  }

  async likeComment(userId: string, commentId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.commentLike.create({
        data: { user_id: userId, comment_id: commentId },
      });
      await tx.comment.update({
        where: { id: commentId },
        data: { like_count: { increment: 1 } },
      });
    });
  }

  async unlikeComment(userId: string, commentId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.commentLike.delete({
        where: {
          user_id_comment_id: { user_id: userId, comment_id: commentId },
        },
      });
      await tx.comment.update({
        where: { id: commentId },
        data: { like_count: { decrement: 1 } },
      });
    });
  }
}

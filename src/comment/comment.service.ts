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
  
  @Injectable()
  export class CommentService {
    constructor(private prisma: PrismaService) {}
  
    async create(
      dto: CreateCommentDto,
      userId: string,
    ): Promise<Comment> {
      const { content, target_id, target_type, parent_comment_id } = dto;
  
      // 1) If replying, validate the parent exists & belongs to same target
      if (parent_comment_id != null) {
        const parent = await this.prisma.comment.findUnique({
          where: { id: parent_comment_id },
          select: { id: true, target_id: true, target_type: true },
        });
        if (!parent) {
          throw new NotFoundException(`Parent comment ${parent_comment_id} not found.`);
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
  
      // 2) Validate that the target (Post or Blog) actually exists
      if (target_type === TargetType.POST) {
        const post = await this.prisma.post.findUnique({ where: { id: target_id } });
        if (!post) {
          throw new NotFoundException(`Post ${target_id} not found.`);
        }
      } else if (target_type === TargetType.BLOG) {
        const blog = await this.prisma.blog.findUnique({ where: { id: target_id } });
        if (!blog) {
          throw new NotFoundException(`Blog ${target_id} not found.`);
        }
      } else {
        throw new BadRequestException(`Invalid target_type: ${target_type}`);
      }
  
      // const data = {
      //   content,
      //   user: { connect: { id: userId } },
      //   target_id,
      //   target_type,
      //   ...(parent_comment_id != null && { parent_comment_id }),
      // };
  
      try {
        return await this.prisma.comment.create({
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
                user: {
                  select: { id: true, username: true, profile_picture_url: true },
                },
              },
            },
          },
        });
      } catch (err: any) {
        if (err instanceof PrismaClientKnownRequestError) {
          if (err.code === 'P2003') {
            throw new NotFoundException(`Related entity not found: ${err.meta?.field_name}`);
          }
        }
        console.error('Create comment failed', { dto, userId, err });
        throw new InternalServerErrorException('Could not create comment.');
      }
    }
  
    async getComments(
      targetId: number,
      targetType: TargetType,
      parentCommentId?: number,
    ) {
      return this.prisma.comment.findMany({
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
  
      // 3) Perform the update
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
        throw new InternalServerErrorException(
          'Could not update the comment.',
        );
      }
    }

    async remove(commentId: number, userId: string): Promise<void> {
      // 1) Verify the comment exists and belongs to the user
      const existing = await this.prisma.comment.findUnique({
        where: { id: commentId },
        select: { id: true, user_id: true },
      });
      if (!existing) throw new NotFoundException(`Comment ${commentId} not found.`);
      if (existing.user_id !== userId) throw new ForbiddenException(`Not your comment.`);
    
      // 2) Delete (or detach) any replies first
      await this.prisma.comment.deleteMany({
        where: { parent_comment_id: commentId },
      });
      // 3) Now delete the comment itself
      try {
        await this.prisma.comment.delete({ where: { id: commentId } });
      } catch (err: any) {
        if (err.code === 'P2025') {
          throw new NotFoundException(`Comment ${commentId} no longer exists.`);
        }
        console.error('Error deleting comment', { commentId, err });
        throw new InternalServerErrorException('Could not delete the comment.');
      }
    }
    
  }
  
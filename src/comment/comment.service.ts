import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
// Ensure TargetType enum and other Prisma types are imported
import { Prisma, TargetType, Comment } from '@prisma/client';
// Ensure PrismaService path is correct for your project structure
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async create(
    createCommentDto: CreateCommentDto,
    userId: string,
  ): Promise<Comment> {
    const { content, target_id, target_type, parent_comment_id } =
      createCommentDto;

    if (parent_comment_id) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: parent_comment_id },
        select: { id: true, target_id: true, target_type: true },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent comment with ID ${parent_comment_id} not found.`,
        );
      }
      // Ensure parent belongs to the *exact same target*
      if (
        parent.target_id !== target_id ||
        parent.target_type !== target_type
      ) {
        throw new BadRequestException(
          `Reply attempt failed: Parent comment belongs to a different target.`,
        );
      }
    }

    let dataToCreate: Prisma.CommentCreateInput;

    if (target_type === TargetType.POST) {
      // Check if the target Post exists
      const targetPost = await this.prisma.post.findUnique({
        where: { id: target_id },
        select: { id: true }, // Only select necessary field for existence check
      });
      if (!targetPost) {
        throw new NotFoundException(
          `Target Post with ID ${target_id} not found.`,
        );
      }
      dataToCreate = {
        content,
        user: { connect: { id: userId } },
        post: { connect: { id: target_id } },
        ...(parent_comment_id && {
          parent_comment: { connect: { id: parent_comment_id } },
        }),
      };
    } else if (target_type === TargetType.BLOG) {
      // Check if the target Blog exists
      const targetBlog = await this.prisma.blog.findUnique({
        where: { id: target_id },
        select: { id: true },
      });
      if (!targetBlog) {
        throw new NotFoundException(
          `Target Blog with ID ${target_id} not found.`,
        );
      }

      dataToCreate = {
        content,
        user: { connect: { id: userId } },
        blog: { connect: { id: target_id } },
        ...(parent_comment_id && {
          parent_comment: { connect: { id: parent_comment_id } },
        }),
      };
    } else {
      throw new BadRequestException(
        `Invalid target_type specified: ${target_type}`,
      );
    }

    try {
      const newComment = await this.prisma.comment.create({
        data: dataToCreate,
        include: {
          user: {
            select: { id: true, username: true, profile_picture_url: true },
          },
        },
      });

      return newComment; // Return the created comment with included user data
    } catch (error: any) {
      console.error(`Failed to create comment: ${error.message}`, {
        DTO: createCommentDto,
        userId,
        PreparedData: dataToCreate, // Log the data object you tried to create
        PrismaError: error, // Log the full Prisma error for better debugging
      });

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          const field = error.meta?.field_name;
          let message = `Related entity not found. Foreign key constraint failed on field: ${field}.`;
          if (String(field).includes('user_id')) {
            message = `User with ID ${userId} not found or could not be linked.`;
          } else if (
            String(field).includes('post_id') ||
            String(field).includes('blog_id')
          ) {
            message = `Target ${target_type} with ID ${target_id} not found or could not be linked.`;
          } else if (String(field).includes('parent_comment_id')) {
            message = `Parent comment with ID ${parent_comment_id} not found or could not be linked.`;
          }
          throw new NotFoundException(message);
        }
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `Failed to connect related entity. ${error.meta?.cause ?? 'Ensure related records (User, Post/Blog, ParentComment) exist.'}`,
          );
        }
      }
      if (error instanceof Error && error.message.includes('comment_count')) {
        console.error(
          'Failed to update comment count after comment creation.',
          error,
        );
      }

      throw new InternalServerErrorException(
        'Could not create comment or update count.',
      );
    }
  }

  async getComments(
    targetId: number,
    targetType: TargetType,
    parentCommentId?: number,
  ) {
    const whereClause: any = {
      ...(targetType === TargetType.POST && { post_id: targetId }),
      ...(targetType === TargetType.BLOG && { blog_id: targetId }),
      ...(parentCommentId !== undefined && {
        parent_comment_id: parentCommentId,
      }),
    };

    return this.prisma.comment.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile_picture_url: true,
          },
        },
        replies: {
          select: {
            id: true,
            content: true,
            created_at: true,
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
  }
}

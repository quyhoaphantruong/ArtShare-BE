import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Prisma, TargetType, Comment } from '@prisma/client';
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

    // 1. Check if Parent Comment exists (if provided)
    if (parent_comment_id) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: parent_comment_id },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent comment with ID ${parent_comment_id} not found.`,
        );
      }
      // Sanity check: Ensure parent belongs to the same target to prevent cross-posting replies
      if (
        parent.target_id !== target_id ||
        parent.target_type !== target_type
      ) {
        throw new BadRequestException(
          `Reply attempt failed: Parent comment belongs to a different target.`,
        );
      }
    }

    // 2. Check if Target exists (Post or Blog)
    //    We need to check based on target_type
    if (target_type === TargetType.POST) {
      const targetPost = await this.prisma.post.findUnique({
        where: { id: target_id },
        select: { id: true },
      });
      if (!targetPost) {
        throw new NotFoundException(
          `Target Post with ID ${target_id} not found.`,
        );
      }
      // TODO: Increment comment_count on the Post atomically later if needed
    } else if (target_type === TargetType.BLOG) {
      // TODO: Implement Blog existence check when you have the Blog model/service
      // const targetBlog = await this.prisma.blog.findUnique({ where: { id: target_id } });
      // if (!targetBlog) {
      //   throw new NotFoundException(`Target Blog with ID ${target_id} not found.`);
      // }
      console.warn(
        `Comment Service: TargetType BLOG check not implemented yet.`,
      );
      // Depending on requirements, you might throw an error here until implemented,
      // or allow it if the FK constraint is sufficient for now.
      // For now, we'll allow it to proceed, relying on potential FK errors later.
    } else {
      // Should be caught by enum validation, but good to have a fallback.
      throw new BadRequestException(`Invalid target_type specified.`);
    }

    // --- Create Comment ---
    try {
      const newComment = await this.prisma.comment.create({
        data: {
          content,
          target_id,
          target_type,
          user_id: userId,
        },
        include: {
          user: {
            select: { id: true, username: true, profile_picture_url: true },
          },
          // Optionally include parent comment or replies count if needed
          // parent_comment: true,
          // _count: { select: { replies: true } }
        },
      });
      return newComment;
    } catch (error: any) {
      console.error(`Failed to create comment: ${error.message}`, {
        DTO: createCommentDto,
        userId,
      });

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          const field = error.meta?.field_name;
          throw new NotFoundException(
            `Related entity not found for field: ${field}. Ensure user, target, and parent comment (if provided) exist.`,
          );
        }
      }
      throw new InternalServerErrorException('Could not create comment.');
    }
  }
}

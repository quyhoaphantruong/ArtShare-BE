import {
  Controller,
  Post,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpStatus,
  Get,
  Query,
  BadRequestException,
  Patch,
  Param,
  ParseIntPipe,
  Delete,
  HttpCode,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Comment, TargetType } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { CurrentUser } from 'src/auth/decorators/users.decorator';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('comments')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances (e.g., string numbers to numbers)
      transformOptions: { enableImplicitConversion: true }, // Helps with query/param auto-conversion if needed elsewhere
    }),
  )
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<Comment> {
    const userId = currentUser.id;
    if (!userId) {
      console.error('UserID not found on request object after JwtAuthGuard.');
      throw new Error('Authentication error: User ID missing.');
    }

    return this.commentService.create(createCommentDto, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getComments(
    @Query('target_id') targetId: string,
    @Query('target_type') targetType: TargetType,
    @CurrentUser() currentUser: CurrentUserType,
    @Query('parent_comment_id') parentCommentId?: string,
  ) {
    const id = parseInt(targetId);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid target_id');
    }

    if (!Object.values(TargetType).includes(targetType)) {
      throw new BadRequestException('Invalid target_type');
    }

    return this.commentService.getComments(
      id,
      targetType,
      currentUser.id,
      parentCommentId ? parseInt(parentCommentId) : undefined,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Edit your own comment' })
  async updateComment(
    @Param('id', ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<Comment> {
    return this.commentService.update(commentId, dto, user.id);
  }

  @Delete('/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete your own comment' })
  async deleteComment(
    @Param('id', ParseIntPipe) commentId: number,
    @CurrentUser() user: CurrentUserType,
  ): Promise<void> {
    console.log('user comment', user);
    await this.commentService.remove(commentId, user.id);
  }

  @Post(':commentId/like')
  @UseGuards(JwtAuthGuard)
  async like(
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.commentService.likeComment(user.id, commentId);
    return { success: true };
  }

  @Post(':commentId/unlike')
  @UseGuards(JwtAuthGuard)
  async unlike(
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.commentService.unlikeComment(user.id, commentId);
    return { success: true };
  }
}

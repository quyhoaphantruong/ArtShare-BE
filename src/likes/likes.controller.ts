import { Controller, Post, Delete, Body } from '@nestjs/common';
import { LikesService } from './likes.service';
import { CreateLikeDto } from './dto/request/create-like.dto';
import { RemoveLikeDto } from './dto/request/remove-like.dto';
import { LikeDetailsDto } from './dto/response/like-details.dto';

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  async createLike(@Body() createLikeDto: CreateLikeDto): Promise<LikeDetailsDto> {
    // TODO: get user_id from access token
    const userId = 1;
    return this.likesService.createLike(createLikeDto, userId);
  }

  @Delete()
  async removeLike(@Body() removeLikeDto: RemoveLikeDto) {
    // TODO: get user_id from access token
    const userId = 1;
    return this.likesService.removeLike(removeLikeDto, userId);
  }
}

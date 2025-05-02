import { LikesService } from './likes.service';
import { CreateLikeDto } from './dto/request/create-like.dto';
import { RemoveLikeDto } from './dto/request/remove-like.dto';
import { LikeDetailsDto } from './dto/response/like-details.dto';
import { CurrentUserType } from 'src/auth/types/current-user.type';
export declare class LikesController {
    private readonly likesService;
    constructor(likesService: LikesService);
    createLike(createLikeDto: CreateLikeDto, user: CurrentUserType): Promise<LikeDetailsDto>;
    removeLike(removeLikeDto: RemoveLikeDto, user: CurrentUserType): Promise<{
        success: boolean;
    }>;
}

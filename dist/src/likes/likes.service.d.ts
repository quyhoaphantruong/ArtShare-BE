import { PrismaService } from 'src/prisma.service';
import { CreateLikeDto } from './dto/request/create-like.dto';
import { LikeDetailsDto } from './dto/response/like-details.dto';
import { RemoveLikeDto } from './dto/request/remove-like.dto';
export declare class LikesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createLike(dto: CreateLikeDto, userId: string): Promise<LikeDetailsDto>;
    removeLike(dto: RemoveLikeDto, userId: string): Promise<{
        success: boolean;
    }>;
    private verifyTargetExists;
    private verifyLikeAlreadyExists;
    private verifyLikeNotExists;
    private findLike;
}

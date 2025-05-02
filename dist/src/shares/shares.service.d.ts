import { PrismaService } from 'src/prisma.service';
import { CreateShareDto } from './dto/request/create-share.dto';
import { ShareDetailsDto } from './dto/response/share-details.dto';
export declare class SharesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createShare(dto: CreateShareDto, userId: string): Promise<ShareDetailsDto>;
    private verifyTargetExists;
    private verifyShareAlreadyExists;
    private findShare;
}

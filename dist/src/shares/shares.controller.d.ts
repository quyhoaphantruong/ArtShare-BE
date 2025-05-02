import { SharesService } from './shares.service';
import { CreateShareDto } from './dto/request/create-share.dto';
import { CurrentUserType } from 'src/auth/types/current-user.type';
export declare class SharesController {
    private readonly sharesService;
    constructor(sharesService: SharesService);
    createShare(createShareDto: CreateShareDto, user: CurrentUserType): Promise<import("./dto/response/share-details.dto").ShareDetailsDto>;
}

import { StorageService } from './storage.service';
import { GetPresignedUrlRequestDto } from './dto/request.dto';
import { GetPresignedUrlResponseDto } from './dto/response.dto';
export declare class StorageController {
    private readonly storageService;
    constructor(storageService: StorageService);
    getPresignedUrl(request: GetPresignedUrlRequestDto): Promise<GetPresignedUrlResponseDto>;
}

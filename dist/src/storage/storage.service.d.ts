import { S3StorageProvider } from './providers/s3-storage.provider';
import { GetPresignedUrlRequestDto } from './dto/request.dto';
import { FileUploadResponse, GetPresignedUrlResponseDto } from './dto/response.dto';
export declare class StorageService {
    private s3Provider;
    private storageProvider;
    constructor(s3Provider: S3StorageProvider);
    generatePresignedUrl(request: GetPresignedUrlRequestDto): Promise<GetPresignedUrlResponseDto>;
    deleteFiles(fileUrls: string[]): Promise<void>;
    uploadFiles(files: Express.Multer.File[], directory: string): Promise<FileUploadResponse[]>;
    getBucketUrl(): Promise<string>;
}

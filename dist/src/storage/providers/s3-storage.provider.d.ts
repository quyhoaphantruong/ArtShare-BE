import { IStorageProvider } from '../storage.interface';
import { GetPresignedUrlRequestDto } from '../dto/request.dto';
import { GetPresignedUrlResponseDto } from '../dto/response.dto';
export declare class S3StorageProvider implements IStorageProvider {
    private s3;
    private bucketName;
    private region;
    private bucketUrl;
    constructor();
    generatePresignedUrl({ fileName, extension, mediaType, directory, }: GetPresignedUrlRequestDto): Promise<GetPresignedUrlResponseDto>;
    deleteFiles(urls: string[]): Promise<void>;
    uploadFiles(files: Express.Multer.File[], directory: string): Promise<{
        url: string;
        key: string;
    }[]>;
    getBucketUrl(): string;
}

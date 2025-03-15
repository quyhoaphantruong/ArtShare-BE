import { Injectable } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { S3 } from 'aws-sdk';
import { nanoid } from 'nanoid';

@Injectable()
export class S3Service {
  private s3: S3;
  public bucketName: string;
  public region: string;
  private bucketUrl: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'ap-southeast-1';
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'artsharing';
    this.bucketUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/`;

    // Configure your S3 client
    this.s3 = new S3({
      region: this.region,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  async uploadFiles(files: Express.Multer.File[]): Promise<{ url: string, media_type: MediaType }[]> {
    return Promise.all(
      files.map(async (file) => {
        // Generate a unique key for this file
        const key = `posts/${nanoid()}-${file.originalname}`;

        // Upload the file to S3
        const response = await this.s3
          .upload({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
          .promise();

        // Check if the upload was successful
        if (!response || !response.Location) {
          throw new Error('Failed to upload file');
        }

        return { url: this.bucketUrl + key, media_type: this.mimeTypeToMediaType(file.mimetype) };
      }),
    );
  }

  async deleteFileByUrl(url: string): Promise<void> {
    
    // Validate that the URL starts with the bucket URL
    if (!url.startsWith(this.bucketUrl)) {
      throw new Error(`URL ${url} is not valid for bucket ${this.bucketUrl}`);
    }
    
    // Extract the key from the URL
    const key = url.replace(this.bucketUrl, '');
    
    // Ensure we have a key before proceeding
    if (!key) {
      throw new Error('Unable to extract file key from URL');
    }
    
    try {
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();
    } catch (error) {
      // Log the error if needed and rethrow or handle it appropriately
      console.error('Error deleting file from S3:', error);
      throw new Error(`Failed to delete file ${key} from S3`);
    }
  }

  mimeTypeToMediaType(mimeType: string): MediaType {
    const mediaData = mimeType.startsWith('image/')
      ? MediaType.IMAGE
      : mimeType.startsWith('video/')
        ? MediaType.VIDEO
        : null;
    
    if (!mediaData) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
    return mediaData;
  }
}

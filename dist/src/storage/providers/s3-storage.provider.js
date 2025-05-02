"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3StorageProvider = void 0;
const common_1 = require("@nestjs/common");
const aws_sdk_1 = require("aws-sdk");
const nanoid_1 = require("nanoid");
const try_catch_decorator_1 = require("../../common/try-catch.decorator");
let S3StorageProvider = class S3StorageProvider {
    constructor() {
        this.region = process.env.AWS_REGION || 'ap-southeast-1';
        this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'artsharing';
        this.bucketUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/`;
        this.s3 = new aws_sdk_1.S3({
            region: this.region,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            signatureVersion: 'v4',
        });
    }
    async generatePresignedUrl({ fileName, extension, mediaType, directory, }) {
        const key = `${directory}/${fileName}.${extension}`;
        const fileUrl = `${this.bucketUrl}${key}`;
        try {
            const presignedUrl = await this.s3.getSignedUrlPromise('putObject', {
                Bucket: this.bucketName,
                Key: key,
                Expires: 300,
                ContentType: `${mediaType}/${extension}`,
            });
            return { presignedUrl, fileUrl };
        }
        catch (error) {
            console.error('Error generating pre-signed URL:', error);
            throw new Error('Could not generate a pre-signed URL');
        }
    }
    async deleteFiles(urls) {
        const objectsToDelete = urls.map((url) => {
            if (!url.startsWith(this.bucketUrl)) {
                throw new Error(`Invalid file URL: ${url}`);
            }
            const key = url.replace(this.bucketUrl, '');
            if (!key) {
                throw new Error('Failed to extract file key from URL');
            }
            return { Key: key };
        });
        const params = {
            Bucket: this.bucketName,
            Delete: {
                Objects: objectsToDelete,
                Quiet: false,
            },
        };
        await this.s3.deleteObjects(params).promise();
    }
    async uploadFiles(files, directory) {
        const uploadPromises = files.map((file) => {
            const key = `${directory}/${(0, nanoid_1.nanoid)()}_${file.originalname}`;
            const params = {
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            };
            return this.s3
                .upload(params)
                .promise()
                .then((data) => {
                return { url: data.Location, key };
            });
        });
        const uploadedFiles = await Promise.all(uploadPromises);
        return uploadedFiles;
    }
    getBucketUrl() {
        return this.bucketUrl;
    }
};
exports.S3StorageProvider = S3StorageProvider;
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], S3StorageProvider.prototype, "deleteFiles", null);
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, String]),
    __metadata("design:returntype", Promise)
], S3StorageProvider.prototype, "uploadFiles", null);
exports.S3StorageProvider = S3StorageProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], S3StorageProvider);

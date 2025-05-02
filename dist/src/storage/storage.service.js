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
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const s3_storage_provider_1 = require("./providers/s3-storage.provider");
let StorageService = class StorageService {
    constructor(s3Provider) {
        this.s3Provider = s3Provider;
        this.storageProvider = this.s3Provider;
    }
    async generatePresignedUrl(request) {
        return this.storageProvider.generatePresignedUrl(request);
    }
    async deleteFiles(fileUrls) {
        return this.storageProvider.deleteFiles(fileUrls);
    }
    async uploadFiles(files, directory) {
        return this.storageProvider.uploadFiles(files, directory);
    }
    async getBucketUrl() {
        return this.storageProvider.getBucketUrl();
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [s3_storage_provider_1.S3StorageProvider])
], StorageService);

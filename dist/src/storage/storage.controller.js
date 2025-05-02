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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const storage_service_1 = require("./storage.service");
const request_dto_1 = require("./dto/request.dto");
let StorageController = class StorageController {
    constructor(storageService) {
        this.storageService = storageService;
    }
    async getPresignedUrl(request) {
        return this.storageService.generatePresignedUrl(request);
    }
};
exports.StorageController = StorageController;
__decorate([
    (0, common_1.Post)('presigned-url'),
    openapi.ApiResponse({ status: 201, type: require("./dto/response.dto").GetPresignedUrlResponseDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_dto_1.GetPresignedUrlRequestDto]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "getPresignedUrl", null);
exports.StorageController = StorageController = __decorate([
    (0, common_1.Controller)('storage'),
    __metadata("design:paramtypes", [storage_service_1.StorageService])
], StorageController);

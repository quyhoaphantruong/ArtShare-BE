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
exports.CollectionController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const collection_service_1 = require("./collection.service");
const users_decorator_1 = require("../auth/decorators/users.decorator");
const create_collection_dto_1 = require("./dto/request/create-collection.dto");
const update_collection_dto_1 = require("./dto/request/update-collection.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let CollectionController = class CollectionController {
    constructor(collectionService) {
        this.collectionService = collectionService;
    }
    async getUserCollections(user) {
        return this.collectionService.getUserCollections(user.id);
    }
    async getCollectionDetails(collectionId, user) {
        return this.collectionService.getCollectionDetails(collectionId, user.id);
    }
    async createCollection(createCollectionDto, user) {
        return this.collectionService.createCollection(createCollectionDto, user.id);
    }
    async updateCollection(collectionId, updateCollectionDto, user) {
        return this.collectionService.updateCollection(collectionId, updateCollectionDto, user.id);
    }
    async addPostToCollection(collectionId, postId, user) {
        await this.collectionService.addPostToCollection(collectionId, postId, user.id);
    }
    async removePostFromCollection(collectionId, postId, user) {
        await this.collectionService.removePostFromCollection(collectionId, postId, user.id);
    }
    async removeCollection(collectionId, user) {
        await this.collectionService.removeCollection(collectionId, user.id);
    }
};
exports.CollectionController = CollectionController;
__decorate([
    (0, common_1.Get)(),
    openapi.ApiResponse({ status: 200, type: [require("./dto/response/collection.dto").CollectionDto] }),
    __param(0, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CollectionController.prototype, "getUserCollections", null);
__decorate([
    (0, common_1.Get)(':id'),
    openapi.ApiResponse({ status: 200, type: require("./dto/response/collection.dto").CollectionDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], CollectionController.prototype, "getCollectionDetails", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    openapi.ApiResponse({ status: common_1.HttpStatus.CREATED, type: require("./dto/response/collection.dto").CollectionDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_collection_dto_1.CreateCollectionDto, Object]),
    __metadata("design:returntype", Promise)
], CollectionController.prototype, "createCollection", null);
__decorate([
    (0, common_1.Patch)(':id'),
    openapi.ApiResponse({ status: 200, type: require("./dto/response/collection.dto").CollectionDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_collection_dto_1.UpdateCollectionDto, Object]),
    __metadata("design:returntype", Promise)
], CollectionController.prototype, "updateCollection", null);
__decorate([
    (0, common_1.Post)(':collectionId/posts/:postId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
    __param(0, (0, common_1.Param)('collectionId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('postId', common_1.ParseIntPipe)),
    __param(2, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], CollectionController.prototype, "addPostToCollection", null);
__decorate([
    (0, common_1.Delete)(':collectionId/posts/:postId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
    __param(0, (0, common_1.Param)('collectionId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('postId', common_1.ParseIntPipe)),
    __param(2, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], CollectionController.prototype, "removePostFromCollection", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], CollectionController.prototype, "removeCollection", null);
exports.CollectionController = CollectionController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('collections'),
    __metadata("design:paramtypes", [collection_service_1.CollectionService])
], CollectionController);

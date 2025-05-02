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
exports.LikesController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const likes_service_1 = require("./likes.service");
const create_like_dto_1 = require("./dto/request/create-like.dto");
const remove_like_dto_1 = require("./dto/request/remove-like.dto");
const users_decorator_1 = require("../auth/decorators/users.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let LikesController = class LikesController {
    constructor(likesService) {
        this.likesService = likesService;
    }
    async createLike(createLikeDto, user) {
        return this.likesService.createLike(createLikeDto, user.id);
    }
    async removeLike(removeLikeDto, user) {
        return this.likesService.removeLike(removeLikeDto, user.id);
    }
};
exports.LikesController = LikesController;
__decorate([
    (0, common_1.Post)(),
    openapi.ApiResponse({ status: 201, type: require("./dto/response/like-details.dto").LikeDetailsDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_like_dto_1.CreateLikeDto, Object]),
    __metadata("design:returntype", Promise)
], LikesController.prototype, "createLike", null);
__decorate([
    (0, common_1.Delete)(),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [remove_like_dto_1.RemoveLikeDto, Object]),
    __metadata("design:returntype", Promise)
], LikesController.prototype, "removeLike", null);
exports.LikesController = LikesController = __decorate([
    (0, common_1.Controller)('likes'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [likes_service_1.LikesService])
], LikesController);

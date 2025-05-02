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
exports.PostsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const posts_service_1 = require("./posts.service");
const create_post_dto_1 = require("./dto/request/create-post.dto");
const update_post_dto_1 = require("./dto/request/update-post.dto");
const platform_express_1 = require("@nestjs/platform-express");
const users_decorator_1 = require("../auth/decorators/users.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const public_decorator_1 = require("../auth/decorators/public.decorator");
let PostsController = class PostsController {
    constructor(postsService) {
        this.postsService = postsService;
    }
    async createPost(createPostDto, images, user) {
        return this.postsService.createPost(createPostDto, images, user.id);
    }
    async updatePost(postId, updatePostDto, images, user) {
        return this.postsService.updatePost(Number(postId), updatePostDto, images, user.id);
    }
    async deletePost(postId) {
        return this.postsService.deletePost(Number(postId));
    }
    async searchPosts(query, page = '1', page_size = '25') {
        return this.postsService.searchPosts(query, Number(page), Number(page_size));
    }
    async getForYouPosts(body, user) {
        const { page = 1, page_size = 25, filter } = body;
        return this.postsService.getForYouPosts(user.id, page, page_size, filter);
    }
    async getFollowingPosts(body, user) {
        const { page = 1, page_size = 24, filter } = body;
        return this.postsService.getFollowingPosts(user.id, page, page_size, filter);
    }
    async getPostDetails(postId) {
        return this.postsService.getPostDetails(Number(postId));
    }
    async findPostsByUsername(username, page = '1', pageSize = '25') {
        return this.postsService.findPostsByUsername(username, Number(page), Number(pageSize));
    }
};
exports.PostsController = PostsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images')),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_post_dto_1.CreatePostDto, Array, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "createPost", null);
__decorate([
    (0, common_1.Patch)(':post_id'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images')),
    openapi.ApiResponse({ status: 200, type: require("./dto/response/post-details.dto").PostDetailsResponseDto }),
    __param(0, (0, common_1.Param)('post_id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __param(3, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_post_dto_1.UpdatePostDto, Array, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "updatePost", null);
__decorate([
    (0, common_1.Delete)(':post_id'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('post_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "deletePost", null);
__decorate([
    (0, common_1.Get)('search'),
    openapi.ApiResponse({ status: 200, type: [require("./dto/response/post-list-item.dto").PostListItemResponseDto] }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('page_size')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "searchPosts", null);
__decorate([
    (0, common_1.Post)('for-you'),
    openapi.ApiResponse({ status: 201, type: [require("./dto/response/post-list-item.dto").PostListItemResponseDto] }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getForYouPosts", null);
__decorate([
    (0, common_1.Post)('following'),
    openapi.ApiResponse({ status: 201, type: [require("./dto/response/post-list-item.dto").PostListItemResponseDto] }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getFollowingPosts", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':post_id'),
    openapi.ApiResponse({ status: 200, type: require("./dto/response/post-details.dto").PostDetailsResponseDto }),
    __param(0, (0, common_1.Param)('post_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getPostDetails", null);
__decorate([
    (0, common_1.Get)('user/:username'),
    openapi.ApiResponse({ status: 200, type: [require("./dto/response/post-list-item.dto").PostListItemResponseDto] }),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('page_size')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "findPostsByUsername", null);
exports.PostsController = PostsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('posts'),
    __metadata("design:paramtypes", [posts_service_1.PostsService])
], PostsController);

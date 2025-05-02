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
exports.BlogController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const blog_service_1 = require("./blog.service");
const create_blog_dto_1 = require("./dto/request/create-blog.dto");
const update_blog_dto_1 = require("./dto/request/update-blog.dto");
const get_blogs_query_dto_1 = require("./dto/request/get-blogs-query.dto");
const rate_blog_dto_1 = require("./dto/request/rate-blog.dto");
const users_decorator_1 = require("../auth/decorators/users.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let BlogController = class BlogController {
    constructor(blogService) {
        this.blogService = blogService;
    }
    async getBlogs(query) {
        const { take, skip, search } = query;
        const finalTake = take ?? 10;
        const finalSkip = skip ?? 0;
        return this.blogService.getBlogs(finalTake, finalSkip, search);
    }
    async getTrendingBlogs(query, user) {
        const { take, skip, categories } = query;
        const finalTake = take ?? 10;
        const finalSkip = skip ?? 0;
        return this.blogService.getTrendingBlogs(finalTake, finalSkip, categories, user?.id);
    }
    async getFollowingBlogs(query, user) {
        const { take, skip, categories } = query;
        const finalTake = take ?? 10;
        const finalSkip = skip ?? 0;
        return this.blogService.getFollowingBlogs(user.id, finalTake, finalSkip, categories);
    }
    async searchBlogs(searchQuery, queryDto) {
        const { take, skip } = queryDto;
        const finalTake = take ?? 10;
        const finalSkip = skip ?? 0;
        return this.blogService.getBlogs(finalTake, finalSkip, searchQuery);
    }
    async findMyBlogs(user) {
        return this.blogService.findMyBlogs(user.id);
    }
    async findBlogById(id, user) {
        const blog = await this.blogService.findBlogById(id, user?.id);
        if (!blog) {
            throw new common_1.NotFoundException(`Blog with ID ${id} not found or access denied.`);
        }
        return blog;
    }
    async createBlog(createBlogDto, user) {
        return this.blogService.createBlog(createBlogDto, user.id);
    }
    async updateBlog(id, updateBlogDto, user) {
        return this.blogService.updateBlog(id, updateBlogDto, user.id);
    }
    async deleteBlog(id, user) {
        await this.blogService.deleteBlog(id, user.id);
        return { message: `Blog with ID ${id} successfully deleted.` };
    }
    async toggleBookmark(id, user) {
        return this.blogService.toggleBookmark(id, user.id);
    }
    async protectBlog(id, user) {
        return this.blogService.protectBlog(id, user.id);
    }
    async rateBlog(id, rateBlogDto, user) {
        return this.blogService.rateBlog(id, user.id, rateBlogDto.rating);
    }
};
exports.BlogController = BlogController;
__decorate([
    (0, common_1.Get)(),
    openapi.ApiResponse({ status: 200, type: [require("./dto/response/blog-list-item.dto").BlogListItemResponseDto] }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_blogs_query_dto_1.GetBlogsQueryDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getBlogs", null);
__decorate([
    (0, common_1.Get)('trending'),
    openapi.ApiResponse({ status: 200, type: [require("./dto/response/blog-list-item.dto").BlogListItemResponseDto] }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_blogs_query_dto_1.GetBlogsQueryDto, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getTrendingBlogs", null);
__decorate([
    (0, common_1.Get)('following'),
    openapi.ApiResponse({ status: 200, type: [require("./dto/response/blog-list-item.dto").BlogListItemResponseDto] }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_blogs_query_dto_1.GetBlogsQueryDto, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getFollowingBlogs", null);
__decorate([
    (0, common_1.Get)('search'),
    openapi.ApiResponse({ status: 200, type: [require("./dto/response/blog-list-item.dto").BlogListItemResponseDto] }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, get_blogs_query_dto_1.GetBlogsQueryDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "searchBlogs", null);
__decorate([
    (0, common_1.Get)('me'),
    openapi.ApiResponse({ status: 200, type: [require("./dto/response/blog-list-item.dto").BlogListItemResponseDto] }),
    __param(0, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "findMyBlogs", null);
__decorate([
    (0, common_1.Get)(':id'),
    openapi.ApiResponse({ status: 200, type: require("./dto/response/blog-details.dto").BlogDetailsResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "findBlogById", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    openapi.ApiResponse({ status: common_1.HttpStatus.CREATED, type: require("./dto/response/blog-details.dto").BlogDetailsResponseDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_blog_dto_1.CreateBlogDto, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "createBlog", null);
__decorate([
    (0, common_1.Patch)(':id'),
    openapi.ApiResponse({ status: 200, type: require("./dto/response/blog-details.dto").BlogDetailsResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_blog_dto_1.UpdateBlogDto, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "updateBlog", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "deleteBlog", null);
__decorate([
    (0, common_1.Post)(':id/bookmark'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK, type: require("./dto/response/bookmark-response.dto").BookmarkResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "toggleBookmark", null);
__decorate([
    (0, common_1.Post)(':id/protect'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK, type: require("./dto/response/protect-response.dto").ProtectResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "protectBlog", null);
__decorate([
    (0, common_1.Post)(':id/rate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK, type: require("./dto/response/rating-response.dto").RatingResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, rate_blog_dto_1.RateBlogDto, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "rateBlog", null);
exports.BlogController = BlogController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('blogs'),
    __metadata("design:paramtypes", [blog_service_1.BlogService])
], BlogController);

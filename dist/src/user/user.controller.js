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
exports.UserController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const user_service_1 = require("./user.service");
const delete_users_dto_1 = require("./dto/delete-users.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const users_decorator_1 = require("../auth/decorators/users.decorator");
const update_users_dto_1 = require("./dto/update-users.dto");
const roles_decorators_1 = require("../auth/decorators/roles.decorators");
const role_enum_1 = require("../auth/enums/role.enum");
let UserController = class UserController {
    constructor(userService) {
        this.userService = userService;
    }
    async findAll() {
        return this.userService.findAll();
    }
    async getProfile(currentUser) {
        return this.userService.getUserProfile(currentUser.id);
    }
    async updateProfile(currentUser, updateUserDto) {
        return this.userService.updateUserProfile(currentUser.id, updateUserDto);
    }
    async deleteUsers(deleteUsersDTO) {
        return this.userService.deleteUsers(deleteUsersDTO);
    }
    async deleteUserById(userId) {
        return this.userService.deleteUserById(userId);
    }
    async followUser(userIdToFollow, currentUser) {
        return this.userService.followUser(currentUser.id, userIdToFollow);
    }
    async unfollowUser(userIdToUnfollow, currentUser) {
        return this.userService.unfollowUser(currentUser.id, userIdToUnfollow);
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorators_1.Roles)(role_enum_1.Role.ADMIN),
    openapi.ApiResponse({ status: 200, type: Object }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UserController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('profile'),
    openapi.ApiResponse({ status: 200, type: require("./dto/user-profile.dto").UserProfileDTO }),
    __param(0, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('profile'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, users_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_users_dto_1.UpdateUserDTO]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Delete)(),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [delete_users_dto_1.DeleteUsersDTO]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "deleteUsers", null);
__decorate([
    (0, common_1.Delete)(':userId'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "deleteUserById", null);
__decorate([
    (0, common_1.Post)(':userId/follow'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "followUser", null);
__decorate([
    (0, common_1.Post)(':userId/unfollow'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "unfollowUser", null);
exports.UserController = UserController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);

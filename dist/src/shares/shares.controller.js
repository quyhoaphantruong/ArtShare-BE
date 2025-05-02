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
exports.SharesController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const shares_service_1 = require("./shares.service");
const create_share_dto_1 = require("./dto/request/create-share.dto");
const users_decorator_1 = require("../auth/decorators/users.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let SharesController = class SharesController {
    constructor(sharesService) {
        this.sharesService = sharesService;
    }
    async createShare(createShareDto, user) {
        return this.sharesService.createShare(createShareDto, user.id);
    }
};
exports.SharesController = SharesController;
__decorate([
    (0, common_1.Post)(),
    openapi.ApiResponse({ status: 201, type: require("./dto/response/share-details.dto").ShareDetailsDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, users_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_share_dto_1.CreateShareDto, Object]),
    __metadata("design:returntype", Promise)
], SharesController.prototype, "createShare", null);
exports.SharesController = SharesController = __decorate([
    (0, common_1.Controller)('shares'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [shares_service_1.SharesService])
], SharesController);

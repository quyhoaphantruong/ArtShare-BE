"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsModule = void 0;
const common_1 = require("@nestjs/common");
const posts_service_1 = require("./posts.service");
const posts_controller_1 = require("./posts.controller");
const storage_service_1 = require("../storage/storage.service");
const s3_storage_provider_1 = require("../storage/providers/s3-storage.provider");
const embedding_service_1 = require("../embedding/embedding.service");
const auth_module_1 = require("../auth/auth.module");
let PostsModule = class PostsModule {
};
exports.PostsModule = PostsModule;
exports.PostsModule = PostsModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        providers: [
            posts_service_1.PostsService,
            storage_service_1.StorageService,
            s3_storage_provider_1.S3StorageProvider,
            embedding_service_1.EmbeddingService,
        ],
        controllers: [posts_controller_1.PostsController],
    })
], PostsModule);

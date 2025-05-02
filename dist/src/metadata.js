"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = async () => {
    const t = {
        ["./user/dto/delete-users.dto"]: await Promise.resolve().then(() => __importStar(require("./user/dto/delete-users.dto"))),
        ["./user/dto/update-users.dto"]: await Promise.resolve().then(() => __importStar(require("./user/dto/update-users.dto"))),
        ["./user/dto/user-profile.dto"]: await Promise.resolve().then(() => __importStar(require("./user/dto/user-profile.dto"))),
        ["./storage/dto/request.dto"]: await Promise.resolve().then(() => __importStar(require("./storage/dto/request.dto"))),
        ["./storage/dto/response.dto"]: await Promise.resolve().then(() => __importStar(require("./storage/dto/response.dto"))),
        ["./blog/dto/request/create-blog.dto"]: await Promise.resolve().then(() => __importStar(require("./blog/dto/request/create-blog.dto"))),
        ["./blog/dto/request/get-blogs-query.dto"]: await Promise.resolve().then(() => __importStar(require("./blog/dto/request/get-blogs-query.dto"))),
        ["./blog/dto/request/rate-blog.dto"]: await Promise.resolve().then(() => __importStar(require("./blog/dto/request/rate-blog.dto"))),
        ["./blog/dto/request/update-blog.dto"]: await Promise.resolve().then(() => __importStar(require("./blog/dto/request/update-blog.dto"))),
        ["./blog/dto/response/blog-details.dto"]: await Promise.resolve().then(() => __importStar(require("./blog/dto/response/blog-details.dto"))),
        ["./blog/dto/response/blog-list-item.dto"]: await Promise.resolve().then(() => __importStar(require("./blog/dto/response/blog-list-item.dto"))),
        ["./blog/dto/response/blog-user-info.dto"]: await Promise.resolve().then(() => __importStar(require("./blog/dto/response/blog-user-info.dto"))),
        ["./blog/dto/response/bookmark-response.dto"]: await Promise.resolve().then(() => __importStar(require("./blog/dto/response/bookmark-response.dto"))),
        ["./blog/dto/response/protect-response.dto"]: await Promise.resolve().then(() => __importStar(require("./blog/dto/response/protect-response.dto"))),
        ["./blog/dto/response/rating-response.dto"]: await Promise.resolve().then(() => __importStar(require("./blog/dto/response/rating-response.dto"))),
        ["./categories/dto/response/category.dto"]: await Promise.resolve().then(() => __importStar(require("./categories/dto/response/category.dto"))),
        ["./categories/dto/request/create-category.dto"]: await Promise.resolve().then(() => __importStar(require("./categories/dto/request/create-category.dto"))),
        ["./categories/dto/request/update-category.dto"]: await Promise.resolve().then(() => __importStar(require("./categories/dto/request/update-category.dto"))),
        ["./collection/dto/request/create-collection.dto"]: await Promise.resolve().then(() => __importStar(require("./collection/dto/request/create-collection.dto"))),
        ["./collection/dto/request/update-collection.dto"]: await Promise.resolve().then(() => __importStar(require("./collection/dto/request/update-collection.dto"))),
        ["./collection/dto/response/collection.dto"]: await Promise.resolve().then(() => __importStar(require("./collection/dto/response/collection.dto"))),
        ["./collection/dto/response/post-summary.dto"]: await Promise.resolve().then(() => __importStar(require("./collection/dto/response/post-summary.dto"))),
        ["./likes/dto/request/create-like.dto"]: await Promise.resolve().then(() => __importStar(require("./likes/dto/request/create-like.dto"))),
        ["./likes/dto/request/remove-like.dto"]: await Promise.resolve().then(() => __importStar(require("./likes/dto/request/remove-like.dto"))),
        ["./posts/dto/request/create-post.dto"]: await Promise.resolve().then(() => __importStar(require("./posts/dto/request/create-post.dto"))),
        ["./posts/dto/request/media.dto"]: await Promise.resolve().then(() => __importStar(require("./posts/dto/request/media.dto"))),
        ["./posts/dto/request/update-post.dto"]: await Promise.resolve().then(() => __importStar(require("./posts/dto/request/update-post.dto"))),
        ["./shares/dto/request/create-share.dto"]: await Promise.resolve().then(() => __importStar(require("./shares/dto/request/create-share.dto"))),
        ["./posts/dto/response/category.dto"]: await Promise.resolve().then(() => __importStar(require("./posts/dto/response/category.dto"))),
        ["./posts/dto/response/media.dto"]: await Promise.resolve().then(() => __importStar(require("./posts/dto/response/media.dto"))),
        ["./posts/dto/response/post-details.dto"]: await Promise.resolve().then(() => __importStar(require("./posts/dto/response/post-details.dto"))),
        ["./posts/dto/response/post-list-item.dto"]: await Promise.resolve().then(() => __importStar(require("./posts/dto/response/post-list-item.dto"))),
        ["./posts/dto/response/user.dto"]: await Promise.resolve().then(() => __importStar(require("./posts/dto/response/user.dto"))),
        ["./likes/dto/response/like-details.dto"]: await Promise.resolve().then(() => __importStar(require("./likes/dto/response/like-details.dto"))),
        ["./shares/dto/response/share-details.dto"]: await Promise.resolve().then(() => __importStar(require("./shares/dto/response/share-details.dto"))),
    };
    return t;
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogListItemResponseDto = void 0;
const openapi = require("@nestjs/swagger");
class BlogListItemResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => Number }, title: { required: true, type: () => String }, created_at: { required: true, type: () => Date }, like_count: { required: true, type: () => Number }, comment_count: { required: true, type: () => Number }, share_count: { required: true, type: () => Number }, view_count: { required: true, type: () => Number }, user: { required: true, type: () => require("./blog-user-info.dto").BlogUserInfoResponseDto }, is_published: { required: true, type: () => Boolean } };
    }
}
exports.BlogListItemResponseDto = BlogListItemResponseDto;

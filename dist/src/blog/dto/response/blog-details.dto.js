"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogDetailsResponseDto = void 0;
const openapi = require("@nestjs/swagger");
class BlogDetailsResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => Number }, title: { required: true, type: () => String }, content: { required: true, type: () => String }, created_at: { required: true, type: () => Date }, updated_at: { required: false, type: () => Date, nullable: true }, is_published: { required: true, type: () => Boolean }, like_count: { required: true, type: () => Number }, comment_count: { required: true, type: () => Number }, share_count: { required: true, type: () => Number }, view_count: { required: true, type: () => Number }, user: { required: true, type: () => require("./blog-user-info.dto").BlogUserInfoResponseDto }, pictures: { required: true, type: () => [String] }, embeddedVideos: { required: true, type: () => [String] } };
    }
}
exports.BlogDetailsResponseDto = BlogDetailsResponseDto;

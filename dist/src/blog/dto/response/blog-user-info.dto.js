"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogUserInfoResponseDto = void 0;
const openapi = require("@nestjs/swagger");
class BlogUserInfoResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, username: { required: true, type: () => String }, profile_picture_url: { required: false, type: () => String, nullable: true } };
    }
}
exports.BlogUserInfoResponseDto = BlogUserInfoResponseDto;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookmarkResponseDto = void 0;
const openapi = require("@nestjs/swagger");
class BookmarkResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { bookmarked: { required: true, type: () => Boolean }, blogId: { required: true, type: () => Number } };
    }
}
exports.BookmarkResponseDto = BookmarkResponseDto;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryResponseDto = void 0;
const openapi = require("@nestjs/swagger");
class CategoryResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { cate_id: { required: true, type: () => Number }, cate_name: { required: true, type: () => String }, url: { required: true, type: () => String, nullable: true }, created_at: { required: true, type: () => Date } };
    }
}
exports.CategoryResponseDto = CategoryResponseDto;

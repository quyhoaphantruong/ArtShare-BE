"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryResponseDto = void 0;
const openapi = require("@nestjs/swagger");
class CategoryResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => Number }, name: { required: true, type: () => String }, description: { required: true, type: () => String }, example_images: { required: true, type: () => [String] }, type: { required: true, enum: require("../request/create-category.dto").CategoryType }, created_at: { required: true, type: () => Date }, updated_at: { required: true, type: () => Date } };
    }
}
exports.CategoryResponseDto = CategoryResponseDto;

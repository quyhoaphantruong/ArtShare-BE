"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingResponseDto = void 0;
const openapi = require("@nestjs/swagger");
class RatingResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { blogId: { required: true, type: () => Number }, newAverageRating: { required: true, type: () => Number, nullable: true }, userRating: { required: true, type: () => Number } };
    }
}
exports.RatingResponseDto = RatingResponseDto;

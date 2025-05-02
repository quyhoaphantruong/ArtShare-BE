"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LikeDetailsDto = void 0;
const openapi = require("@nestjs/swagger");
class LikeDetailsDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: true, type: () => String }, target_id: { required: true, type: () => Number }, target_type: { required: true, type: () => Object }, created_at: { required: true, type: () => Date } };
    }
}
exports.LikeDetailsDto = LikeDetailsDto;

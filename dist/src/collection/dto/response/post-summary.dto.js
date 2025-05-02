"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostSummaryDto = void 0;
const openapi = require("@nestjs/swagger");
class PostSummaryDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => Number }, title: { required: true, type: () => String }, thumbnail_url: { required: false, type: () => String }, created_at: { required: true, type: () => Date } };
    }
}
exports.PostSummaryDto = PostSummaryDto;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionDto = void 0;
const openapi = require("@nestjs/swagger");
class CollectionDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => Number }, name: { required: true, type: () => String }, is_private: { required: true, type: () => Boolean }, thumbnail_url: { required: false, type: () => String }, description: { required: false, type: () => String }, user_id: { required: true, type: () => String }, created_at: { required: true, type: () => Date }, updated_at: { required: true, type: () => Date }, posts: { required: true, type: () => [require("./post-summary.dto").PostSummaryDto] } };
    }
}
exports.CollectionDto = CollectionDto;

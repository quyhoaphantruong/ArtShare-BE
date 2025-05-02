"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtectResponseDto = void 0;
const openapi = require("@nestjs/swagger");
class ProtectResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { blogId: { required: true, type: () => Number }, protectionStatus: { required: true, type: () => String } };
    }
}
exports.ProtectResponseDto = ProtectResponseDto;

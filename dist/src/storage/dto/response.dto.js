"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUploadResponse = exports.GetPresignedUrlResponseDto = void 0;
const openapi = require("@nestjs/swagger");
class GetPresignedUrlResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { presignedUrl: { required: true, type: () => String }, fileUrl: { required: true, type: () => String } };
    }
}
exports.GetPresignedUrlResponseDto = GetPresignedUrlResponseDto;
class FileUploadResponse {
    static _OPENAPI_METADATA_FACTORY() {
        return { url: { required: true, type: () => String }, key: { required: true, type: () => String } };
    }
}
exports.FileUploadResponse = FileUploadResponse;

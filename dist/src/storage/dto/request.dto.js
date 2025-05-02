"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetPresignedUrlRequestDto = void 0;
const openapi = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
class GetPresignedUrlRequestDto {
    constructor() {
        this.fileName = '';
        this.directory = 'uncategorized';
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { fileName: { required: true, type: () => String, default: "" }, extension: { required: true, type: () => String, pattern: "/^(png|jpg|jpeg|gif|webp|mp4|mov|avi)$/i" }, mediaType: { required: true, type: () => Object }, directory: { required: false, type: () => String, default: "uncategorized" } };
    }
}
exports.GetPresignedUrlRequestDto = GetPresignedUrlRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GetPresignedUrlRequestDto.prototype, "fileName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(png|jpg|jpeg|gif|webp|mp4|mov|avi)$/i, {
        message: 'Invalid file extension',
    }),
    __metadata("design:type", String)
], GetPresignedUrlRequestDto.prototype, "extension", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.MediaType, {
        message: 'Invalid media type. Allowed values: image, video',
    }),
    __metadata("design:type", String)
], GetPresignedUrlRequestDto.prototype, "mediaType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetPresignedUrlRequestDto.prototype, "directory", void 0);

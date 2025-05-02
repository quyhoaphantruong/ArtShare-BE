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
exports.UpdatePostDto = void 0;
const openapi = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class UpdatePostDto {
    constructor() {
        this.is_mature = false;
        this.ai_created = false;
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { title: { required: false, type: () => String }, description: { required: false, type: () => String }, is_mature: { required: true, type: () => Boolean, default: false }, ai_created: { required: true, type: () => Boolean, default: false }, thumbnail_url: { required: false, type: () => String }, video_url: { required: false, type: () => String }, cate_ids: { required: false, type: () => [Number] }, existing_image_urls: { required: false, type: () => [String] } };
    }
}
exports.UpdatePostDto = UpdatePostDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePostDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePostDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ obj, key }) => {
        return obj[key] === 'true' ? true : obj[key] === 'false' ? false : obj[key];
    }),
    __metadata("design:type", Boolean)
], UpdatePostDto.prototype, "is_mature", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ obj, key }) => {
        return obj[key] === 'true' ? true : obj[key] === 'false' ? false : obj[key];
    }),
    __metadata("design:type", Boolean)
], UpdatePostDto.prototype, "ai_created", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePostDto.prototype, "thumbnail_url", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePostDto.prototype, "video_url", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (!value)
            return [];
        try {
            return typeof value === 'string'
                ? JSON.parse(value).map((v) => Number(v))
                : Array.isArray(value)
                    ? value.map(Number)
                    : [];
        }
        catch {
            return [];
        }
    }, { toClassOnly: true }),
    __metadata("design:type", Array)
], UpdatePostDto.prototype, "cate_ids", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (!value)
            return [];
        try {
            return typeof value === 'string'
                ? JSON.parse(value)
                : Array.isArray(value)
                    ? value
                    : [];
        }
        catch {
            return [];
        }
    }, { toClassOnly: true }),
    __metadata("design:type", Array)
], UpdatePostDto.prototype, "existing_image_urls", void 0);

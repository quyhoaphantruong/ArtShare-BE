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
exports.CreateCategoryDto = exports.CategoryType = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var CategoryType;
(function (CategoryType) {
    CategoryType["MEDIUM"] = "MEDIUM";
    CategoryType["ATTRIBUTE"] = "ATTRIBUTE";
})(CategoryType || (exports.CategoryType = CategoryType = {}));
class CreateCategoryDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, example_images: { required: true, type: () => [String] }, type: { required: true, enum: require("./create-category.dto").CategoryType }, description: { required: false, type: () => String } };
    }
}
exports.CreateCategoryDto = CreateCategoryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateCategoryDto.prototype, "example_images", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(CategoryType),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "description", void 0);

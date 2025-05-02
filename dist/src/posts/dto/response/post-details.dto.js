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
exports.PostDetailsResponseDto = void 0;
const openapi = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const media_dto_1 = require("./media.dto");
const user_dto_1 = require("./user.dto");
const category_dto_1 = require("./category.dto");
class PostDetailsResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => Number }, user_id: { required: true, type: () => String }, title: { required: true, type: () => String }, description: { required: false, type: () => String }, thumbnail_url: { required: true, type: () => String }, is_published: { required: true, type: () => Boolean }, is_private: { required: true, type: () => Boolean }, like_count: { required: true, type: () => Number }, share_count: { required: true, type: () => Number }, comment_count: { required: true, type: () => Number }, created_at: { required: true, type: () => Date }, medias: { required: true, type: () => [require("./media.dto").MediaResponseDto] }, user: { required: true, type: () => require("./user.dto").UserResponseDto }, categories: { required: true, type: () => [require("./category.dto").CategoryResponseDto] } };
    }
}
exports.PostDetailsResponseDto = PostDetailsResponseDto;
__decorate([
    (0, class_transformer_1.Type)(() => media_dto_1.MediaResponseDto),
    __metadata("design:type", Array)
], PostDetailsResponseDto.prototype, "medias", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => user_dto_1.UserResponseDto),
    __metadata("design:type", user_dto_1.UserResponseDto)
], PostDetailsResponseDto.prototype, "user", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => category_dto_1.CategoryResponseDto),
    __metadata("design:type", Array)
], PostDetailsResponseDto.prototype, "categories", void 0);

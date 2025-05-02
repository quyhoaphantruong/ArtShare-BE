"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProfileDTO = void 0;
const openapi = require("@nestjs/swagger");
class UserProfileDTO {
    static _OPENAPI_METADATA_FACTORY() {
        return { username: { required: true, type: () => String }, email: { required: true, type: () => String }, full_name: { required: true, type: () => String, nullable: true }, profile_picture_url: { required: true, type: () => String, nullable: true }, bio: { required: true, type: () => String, nullable: true }, following_count: { required: true, type: () => Number }, followers_count: { required: true, type: () => Number } };
    }
}
exports.UserProfileDTO = UserProfileDTO;

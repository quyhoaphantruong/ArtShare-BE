"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShareDetailsDto = exports.SharePlatform = void 0;
const openapi = require("@nestjs/swagger");
var SharePlatform;
(function (SharePlatform) {
    SharePlatform["FACEBOOK"] = "FACEBOOK";
    SharePlatform["GOOGLE"] = "GOOGLE";
})(SharePlatform || (exports.SharePlatform = SharePlatform = {}));
class ShareDetailsDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => Number }, user_id: { required: true, type: () => String }, post_id: { required: false, type: () => Number }, blog_id: { required: false, type: () => Number }, share_platform: { required: true, enum: require("./share-details.dto").SharePlatform }, created_at: { required: true, type: () => Date } };
    }
}
exports.ShareDetailsDto = ShareDetailsDto;

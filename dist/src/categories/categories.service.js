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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const create_category_dto_1 = require("./dto/request/create-category.dto");
const update_category_dto_1 = require("./dto/request/update-category.dto");
const prisma_service_1 = require("../prisma.service");
const try_catch_decorator_1 = require("../common/try-catch.decorator");
const category_dto_1 = require("./dto/response/category.dto");
const class_transformer_1 = require("class-transformer");
let CategoriesService = class CategoriesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createCategoryDto) {
        const createdCategory = await this.prisma.category.create({
            data: createCategoryDto,
        });
        return (0, class_transformer_1.plainToInstance)(category_dto_1.CategoryResponseDto, createdCategory);
    }
    async findAll() {
        const categories = await this.prisma.category.findMany();
        return (0, class_transformer_1.plainToInstance)(category_dto_1.CategoryResponseDto, categories);
    }
    async findOne(id) {
        const category = await this.prisma.category.findUnique({
            where: { id },
        });
        if (!category) {
            throw new common_1.BadRequestException(`Category with id ${id} not found`);
        }
        return (0, class_transformer_1.plainToInstance)(category_dto_1.CategoryResponseDto, category);
    }
    async update(id, updateCategoryDto) {
        await this.checkCategoryExists(id);
        const updatedCategory = await this.prisma.category.update({
            where: { id },
            data: updateCategoryDto,
        });
        return (0, class_transformer_1.plainToInstance)(category_dto_1.CategoryResponseDto, updatedCategory);
    }
    async remove(id) {
        await this.checkCategoryExists(id);
        const deletedCategory = await this.prisma.category.delete({
            where: { id },
        });
        return (0, class_transformer_1.plainToInstance)(category_dto_1.CategoryResponseDto, deletedCategory);
    }
    async checkCategoryExists(id) {
        const category = await this.prisma.category.findUnique({
            where: { id },
        });
        if (!category) {
            throw new common_1.BadRequestException(`Category with id ${id} not found`);
        }
    }
};
exports.CategoriesService = CategoriesService;
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_category_dto_1.CreateCategoryDto]),
    __metadata("design:returntype", Promise)
], CategoriesService.prototype, "create", null);
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CategoriesService.prototype, "findAll", null);
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CategoriesService.prototype, "findOne", null);
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_category_dto_1.UpdateCategoryDto]),
    __metadata("design:returntype", Promise)
], CategoriesService.prototype, "update", null);
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CategoriesService.prototype, "remove", null);
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoriesService);

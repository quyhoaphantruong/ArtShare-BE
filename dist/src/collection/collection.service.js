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
exports.CollectionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const client_1 = require("@prisma/client");
const collection_mapping_helper_1 = require("./helpers/collection-mapping.helper");
let CollectionService = class CollectionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUserCollections(userId) {
        try {
            const collections = await this.prisma.collection.findMany({
                where: { user_id: userId },
                select: collection_mapping_helper_1.collectionWithPostsSelect,
                orderBy: {
                    created_at: 'desc',
                },
            });
            return collections.map(collection_mapping_helper_1.mapCollectionToDto);
        }
        catch (error) {
            console.error('Error fetching user collections:', error);
            throw new common_1.InternalServerErrorException('Failed to fetch collections.');
        }
    }
    async createCollection(dto, userId) {
        try {
            const newCollection = await this.prisma.collection.create({
                data: {
                    name: dto.name.trim(),
                    is_private: dto.is_private,
                    description: dto.description,
                    thumbnail_url: dto.thumbnail_url,
                    user: {
                        connect: { id: userId },
                    },
                },
                select: collection_mapping_helper_1.collectionWithPostsSelect,
            });
            return (0, collection_mapping_helper_1.mapCollectionToDto)(newCollection);
        }
        catch (error) {
            console.error('Error creating collection:', error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new common_1.BadRequestException('A collection with this name already exists.');
                }
            }
            throw new common_1.InternalServerErrorException('Failed to create collection.');
        }
    }
    async updateCollection(collectionId, dto, userId) {
        await this.findCollectionOwnedByUser(collectionId, userId, false);
        const updateData = {};
        if (dto.name !== undefined)
            updateData.name = dto.name.trim();
        if (dto.description !== undefined)
            updateData.description = dto.description;
        if (dto.isPrivate !== undefined)
            updateData.is_private = dto.isPrivate;
        if (dto.thumbnail_url !== undefined)
            updateData.thumbnail_url = dto.thumbnail_url;
        if (Object.keys(updateData).length === 0) {
            console.warn(`Update called for collection ${collectionId} with no actual changes.`);
            const currentCollection = await this.prisma.collection.findUnique({
                where: { id: collectionId },
                select: collection_mapping_helper_1.collectionWithPostsSelect,
            });
            if (!currentCollection) {
                throw new common_1.NotFoundException(`Collection with ID ${collectionId} not found after ownership check.`);
            }
            return (0, collection_mapping_helper_1.mapCollectionToDto)(currentCollection);
        }
        try {
            const updatedCollection = await this.prisma.collection.update({
                where: { id: collectionId },
                data: updateData,
                select: collection_mapping_helper_1.collectionWithPostsSelect,
            });
            return (0, collection_mapping_helper_1.mapCollectionToDto)(updatedCollection);
        }
        catch (error) {
            console.error(`Error updating collection ${collectionId}:`, error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new common_1.NotFoundException(`Collection with ID ${collectionId} not found.`);
                }
            }
            throw new common_1.InternalServerErrorException('Failed to update collection.');
        }
    }
    async addPostToCollection(collectionId, postId, userId) {
        await this.findCollectionOwnedByUser(collectionId, userId);
        try {
            await this.prisma.collection.update({
                where: { id: collectionId },
                data: {
                    posts: {
                        connect: { id: postId },
                    },
                },
            });
        }
        catch (error) {
            console.error(`Error adding post ${postId} to collection ${collectionId}:`, error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    const postExists = await this.prisma.post.findUnique({
                        where: { id: postId },
                        select: { id: true },
                    });
                    if (!postExists) {
                        throw new common_1.NotFoundException(`Post with ID ${postId} not found.`);
                    }
                    else {
                        throw new common_1.NotFoundException(`Collection with ID ${collectionId} not found or failed to connect post.`);
                    }
                }
            }
            throw new common_1.InternalServerErrorException('Failed to add post to collection.');
        }
    }
    async removePostFromCollection(collectionId, postId, userId) {
        await this.findCollectionOwnedByUser(collectionId, userId);
        try {
            await this.prisma.collection.update({
                where: {
                    id: collectionId,
                    posts: { some: { id: postId } },
                },
                data: {
                    posts: {
                        disconnect: { id: postId },
                    },
                },
            });
        }
        catch (error) {
            console.error('Error removing post from collection:', error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2025') {
                throw new common_1.NotFoundException(`Collection with ID ${collectionId} not found, or post with ID ${postId} not associated with it.`);
            }
            throw new common_1.InternalServerErrorException('Failed to remove post from collection.');
        }
    }
    async findCollectionOwnedByUser(collectionId, userId, includePosts = false) {
        const collection = await this.prisma.collection.findUnique({
            where: { id: collectionId },
            include: { posts: includePosts },
        });
        if (!collection) {
            throw new common_1.NotFoundException(`Collection with ID ${collectionId} not found.`);
        }
        if (collection.user_id !== userId) {
            throw new common_1.ForbiddenException(`You do not have permission to access collection ${collectionId}.`);
        }
        return collection;
    }
    async getCollectionDetails(collectionId, userId) {
        const collection = await this.findCollectionOwnedByUser(collectionId, userId, true);
        return (0, collection_mapping_helper_1.mapCollectionToDto)(collection);
    }
    async removeCollection(collectionId, userId) {
        await this.findCollectionOwnedByUser(collectionId, userId);
        try {
            await this.prisma.collection.delete({
                where: { id: collectionId },
            });
        }
        catch (error) {
            console.error(`Error deleting collection ${collectionId}:`, error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new common_1.NotFoundException(`Collection with ID ${collectionId} not found.`);
                }
            }
            throw new common_1.InternalServerErrorException('Failed to delete collection.');
        }
    }
};
exports.CollectionService = CollectionService;
exports.CollectionService = CollectionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CollectionService);

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
exports.PostsService = exports.MediaData = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const class_transformer_1 = require("class-transformer");
const storage_service_1 = require("../storage/storage.service");
const embedding_service_1 = require("../embedding/embedding.service");
const client_1 = require("@prisma/client");
const js_client_rest_1 = require("@qdrant/js-client-rest");
const try_catch_decorator_1 = require("../common/try-catch.decorator");
const create_post_dto_1 = require("./dto/request/create-post.dto");
const post_details_dto_1 = require("./dto/response/post-details.dto");
const update_post_dto_1 = require("./dto/request/update-post.dto");
const post_list_item_dto_1 = require("./dto/response/post-list-item.dto");
class VectorParams {
}
class MediaData {
}
exports.MediaData = MediaData;
let PostsService = class PostsService {
    constructor(prisma, storageService, embeddingService) {
        this.prisma = prisma;
        this.storageService = storageService;
        this.embeddingService = embeddingService;
        this.qdrantCollectionName = 'posts';
        this.qdrantClient = new js_client_rest_1.QdrantClient({
            url: process.env.QDRANT_URL,
            port: 6333,
            apiKey: process.env.QDRANT_API_KEY,
        });
    }
    async ensureQdrantCollectionExists() {
        const collections = await this.qdrantClient.getCollections();
        const exists = collections.collections.some((col) => col.name === this.qdrantCollectionName);
        if (!exists) {
            await this.qdrantClient.createCollection(this.qdrantCollectionName, {
                vectors: {
                    title: { size: 512, distance: 'Cosine' },
                    description: { size: 512, distance: 'Cosine' },
                    images: { size: 512, distance: 'Cosine' },
                },
            });
            console.log(`Created Qdrant collection '${this.qdrantCollectionName}' with named vectors`);
        }
    }
    async createPost(createPostDto, images, userId) {
        const { cate_ids, video_url, thumbnail_url, ...createPostData } = createPostDto;
        const imageUploads = await this.storageService.uploadFiles(images, 'posts');
        const mediasData = [
            ...(video_url ? [{ url: video_url, media_type: client_1.MediaType.video }] : []),
            ...imageUploads.map(({ url }) => ({ url, media_type: client_1.MediaType.image })),
        ];
        const post = await this.prisma.post.create({
            data: {
                user_id: userId,
                ...createPostData,
                thumbnail_url: thumbnail_url || imageUploads[0]?.url || '',
                medias: {
                    create: mediasData.map(({ url, media_type }) => ({
                        media_type,
                        url,
                        creator_id: userId,
                    })),
                },
                categories: {
                    connect: (cate_ids || []).map((cate_id) => ({ id: cate_id })),
                },
            },
            include: { medias: true, user: true, categories: true },
        });
        await this.ensureQdrantCollectionExists();
        await this.savePostEmbedding(post.id, createPostData.title, createPostData.description, images);
        return (0, class_transformer_1.plainToInstance)(post_details_dto_1.PostDetailsResponseDto, post);
    }
    async updatePost(postId, updatePostDto, images, userId) {
        const existingPost = await this.prisma.post.findUnique({
            where: { id: postId },
            include: { medias: true },
        });
        if (!existingPost) {
            throw new common_1.NotFoundException('Post not found');
        }
        const { cate_ids, video_url, existing_image_urls = [], thumbnail_url, ...postUpdateData } = updatePostDto;
        const existingImageUrlsSet = new Set(existing_image_urls);
        const existingImages = existingPost.medias.filter((m) => m.media_type === client_1.MediaType.image);
        const imagesToDelete = existingImages.filter((m) => !existingImageUrlsSet.has(m.url));
        const oldThumb = existingPost.thumbnail_url;
        if (thumbnail_url && oldThumb && thumbnail_url !== oldThumb) {
            await this.storageService.deleteFiles([oldThumb]);
        }
        if (imagesToDelete.length > 0) {
            await Promise.all([
                this.prisma.media.deleteMany({
                    where: {
                        id: { in: imagesToDelete.map((m) => m.id) },
                    },
                }),
                this.storageService.deleteFiles(imagesToDelete.map((m) => m.url)),
            ]);
        }
        let newImageUploads = [];
        if (images && images.length > 0) {
            newImageUploads = await this.storageService.uploadFiles(images, 'posts');
        }
        const videoUrl = (video_url ?? '').trim();
        const existingVideo = existingPost.medias.find((m) => m.media_type === client_1.MediaType.video);
        const wantsDeletion = existingVideo && videoUrl === '';
        const wantsReplace = existingVideo && videoUrl && videoUrl !== existingVideo.url;
        const wantsNewUpload = !existingVideo && videoUrl;
        if (wantsDeletion || wantsReplace) {
            await Promise.all([
                this.prisma.media.delete({ where: { id: existingVideo.id } }),
                this.storageService.deleteFiles([existingVideo.url]),
            ]);
        }
        const mediasData = [
            ...(wantsReplace || wantsNewUpload
                ? [{ url: videoUrl, media_type: client_1.MediaType.video }]
                : []),
            ...newImageUploads.map(({ url }) => ({
                url,
                media_type: client_1.MediaType.image,
            })),
        ];
        const updatedPost = await this.prisma.post.update({
            where: { id: postId },
            data: {
                ...postUpdateData,
                thumbnail_url: thumbnail_url,
                categories: {
                    set: (cate_ids || []).map((id) => ({ id })),
                },
                ...(mediasData.length > 0 && {
                    medias: {
                        create: mediasData.map(({ url, media_type }) => ({
                            media_type,
                            url,
                            creator_id: userId,
                        })),
                    },
                }),
            },
            include: { medias: true, user: true, categories: true },
        });
        this.updatePostEmbedding(postId, postUpdateData.title, postUpdateData.description, images);
        return (0, class_transformer_1.plainToInstance)(post_details_dto_1.PostDetailsResponseDto, updatedPost);
    }
    async deletePost(postId) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            include: { medias: true },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        if (post.medias && post.medias.length > 0) {
            await Promise.all(post.medias.map((media) => this.storageService.deleteFiles([media.url])));
        }
        return this.prisma.post.delete({ where: { id: postId } });
    }
    async getForYouPosts(userId, page, page_size, filter) {
        const skip = (page - 1) * page_size;
        const whereClause = filter && filter.length > 0
            ? { categories: { some: { name: { in: filter } } } }
            : {};
        const posts = await this.prisma.post.findMany({
            where: whereClause,
            orderBy: { share_count: 'desc' },
            take: page_size,
            skip,
            include: {
                medias: true,
                user: true,
                categories: true,
            },
        });
        return (0, class_transformer_1.plainToInstance)(post_list_item_dto_1.PostListItemResponseDto, posts);
    }
    async getFollowingPosts(userId, page, page_size, filter) {
        const followingUsers = await this.prisma.follow.findMany({
            where: { follower_id: userId },
            select: { following_id: true },
        });
        const followingIds = followingUsers.map((follow) => follow.following_id);
        const skip = (page - 1) * page_size;
        const whereClause = {
            user_id: { in: followingIds },
            ...(filter &&
                filter.length > 0 && {
                categories: { some: { name: { in: filter } } },
            }),
        };
        const posts = await this.prisma.post.findMany({
            where: whereClause,
            skip,
            take: page_size,
            include: {
                medias: true,
                user: true,
                categories: true,
            },
            orderBy: {
                created_at: 'desc',
            },
        });
        return (0, class_transformer_1.plainToInstance)(post_list_item_dto_1.PostListItemResponseDto, posts);
    }
    async getPostDetails(postId) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            include: { medias: true, user: true, categories: true },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        await this.prisma.post.update({
            where: { id: postId },
            data: { view_count: { increment: 1 } },
        });
        return (0, class_transformer_1.plainToInstance)(post_details_dto_1.PostDetailsResponseDto, post);
    }
    async searchPosts(query, page, page_size) {
        const queryEmbedding = await this.embeddingService.generateEmbeddingFromText(query);
        const searchResponse = await this.qdrantClient.query(this.qdrantCollectionName, {
            prefetch: [
                {
                    query: queryEmbedding,
                    using: 'images',
                },
                {
                    query: queryEmbedding,
                    using: 'description',
                },
                {
                    query: queryEmbedding,
                    using: 'title',
                },
            ],
            query: {
                fusion: 'dbsf',
            },
            offset: (page - 1) * page_size,
            limit: page_size,
        });
        const pointIds = searchResponse.points.map((point) => Number(point.id));
        const posts = await this.prisma.post.findMany({
            where: { id: { in: pointIds } },
            include: { medias: true, user: true, categories: true },
        });
        const sortedPosts = pointIds.map((id) => posts.find((post) => post.id === id));
        return (0, class_transformer_1.plainToInstance)(post_list_item_dto_1.PostListItemResponseDto, sortedPosts);
    }
    async getVectorParams(title, description, imageFiles) {
        const [titleEmbedding, descriptionEmbedding, imageEmbeddings] = await Promise.all([
            title
                ? this.embeddingService.generateEmbeddingFromText(title)
                : undefined,
            description
                ? this.embeddingService.generateEmbeddingFromText(description)
                : undefined,
            imageFiles && imageFiles.length > 0
                ? Promise.all(imageFiles.map((image) => this.embeddingService.generateEmbeddingFromImageBlob(new Blob([image.buffer]))))
                : undefined,
        ]);
        return {
            titleEmbedding: titleEmbedding,
            descriptionEmbedding: descriptionEmbedding,
            imagesEmbedding: imageEmbeddings,
        };
    }
    averageEmbeddings(embeddings) {
        if (!embeddings || embeddings.length === 0)
            return [];
        const length = embeddings[0].length;
        const sum = new Array(length).fill(0);
        embeddings.forEach((vec) => {
            for (let i = 0; i < length; i++) {
                sum[i] += vec[i];
            }
        });
        return sum.map((val) => val / embeddings.length);
    }
    async savePostEmbedding(postId, title, description, imageFiles) {
        const { titleEmbedding, descriptionEmbedding, imagesEmbedding } = await this.getVectorParams(title, description, imageFiles);
        if (!titleEmbedding) {
            throw new Error('titleEmbedding is required but missing!');
        }
        const averageImagesEmbedding = imagesEmbedding && imagesEmbedding.length > 0
            ? this.averageEmbeddings(imagesEmbedding)
            : new Array(512).fill(0);
        const safeDescriptionEmbedding = descriptionEmbedding ?? new Array(512).fill(0);
        const pointsVector = [
            {
                id: postId,
                vector: {
                    title: titleEmbedding,
                    description: safeDescriptionEmbedding,
                    images: averageImagesEmbedding,
                },
            },
        ];
        const operationInfo = await this.qdrantClient.upsert(this.qdrantCollectionName, {
            wait: true,
            points: pointsVector,
        });
        console.log('Upsert operation info:', operationInfo);
    }
    async updatePostEmbedding(postId, title, description, imageFiles) {
        const { titleEmbedding, descriptionEmbedding, imagesEmbedding, } = await this.getVectorParams(title, description, imageFiles);
        if (!titleEmbedding) {
            throw new Error('titleEmbedding is required but missing!');
        }
        const safeDescriptionEmbedding = descriptionEmbedding ?? new Array(512).fill(0);
        const averageImagesEmbedding = imagesEmbedding && imagesEmbedding.length > 0
            ? this.averageEmbeddings(imagesEmbedding)
            : new Array(512).fill(0);
        const pointVector = [
            {
                id: postId,
                vector: {
                    title: titleEmbedding,
                    description: safeDescriptionEmbedding,
                    images: averageImagesEmbedding,
                },
            },
        ];
        const operationInfo = await this.qdrantClient.updateVectors(this.qdrantCollectionName, {
            points: pointVector,
        });
        console.log('Update operation info:', operationInfo);
    }
    async findPostsByUsername(username, page, page_size) {
        const user = await this.prisma.user.findUnique({
            where: { username: username },
            select: { id: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const skip = (page - 1) * page_size;
        const posts = await this.prisma.post.findMany({
            where: { user_id: user.id },
            skip,
            take: page_size,
            include: {
                medias: true,
                user: true,
                categories: true,
            },
            orderBy: {
                created_at: 'desc',
            },
        });
        return (0, class_transformer_1.plainToInstance)(post_list_item_dto_1.PostListItemResponseDto, posts);
    }
};
exports.PostsService = PostsService;
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_post_dto_1.CreatePostDto, Array, String]),
    __metadata("design:returntype", Promise)
], PostsService.prototype, "createPost", null);
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_post_dto_1.UpdatePostDto, Array, String]),
    __metadata("design:returntype", Promise)
], PostsService.prototype, "updatePost", null);
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Array]),
    __metadata("design:returntype", Promise)
], PostsService.prototype, "getForYouPosts", null);
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PostsService.prototype, "getPostDetails", null);
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], PostsService.prototype, "searchPosts", null);
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Object, Array]),
    __metadata("design:returntype", Promise)
], PostsService.prototype, "savePostEmbedding", null);
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object, Array]),
    __metadata("design:returntype", Promise)
], PostsService.prototype, "updatePostEmbedding", null);
__decorate([
    (0, try_catch_decorator_1.TryCatch)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], PostsService.prototype, "findPostsByUsername", null);
exports.PostsService = PostsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService,
        embedding_service_1.EmbeddingService])
], PostsService);

import { PrismaService } from 'src/prisma.service';
import { StorageService } from 'src/storage/storage.service';
import { EmbeddingService } from 'src/embedding/embedding.service';
import { MediaType, Post } from '@prisma/client';
import { CreatePostDto } from './dto/request/create-post.dto';
import { PostDetailsResponseDto } from './dto/response/post-details.dto';
import { UpdatePostDto } from './dto/request/update-post.dto';
import { PostListItemResponseDto } from './dto/response/post-list-item.dto';
export declare class MediaData {
    url: string;
    media_type: MediaType;
}
export declare class PostsService {
    private readonly prisma;
    private readonly storageService;
    private readonly embeddingService;
    private readonly qdrantCollectionName;
    private readonly qdrantClient;
    constructor(prisma: PrismaService, storageService: StorageService, embeddingService: EmbeddingService);
    private ensureQdrantCollectionExists;
    createPost(createPostDto: CreatePostDto, images: Express.Multer.File[], userId: string): Promise<PostDetailsResponseDto>;
    updatePost(postId: number, updatePostDto: UpdatePostDto, images: Express.Multer.File[], userId: string): Promise<PostDetailsResponseDto>;
    deletePost(postId: number): Promise<Post>;
    getForYouPosts(userId: string, page: number, page_size: number, filter: string[]): Promise<PostListItemResponseDto[]>;
    getFollowingPosts(userId: string, page: number, page_size: number, filter: string[]): Promise<PostListItemResponseDto[]>;
    getPostDetails(postId: number): Promise<PostDetailsResponseDto>;
    searchPosts(query: string, page: number, page_size: number): Promise<PostListItemResponseDto[]>;
    private getVectorParams;
    private averageEmbeddings;
    private savePostEmbedding;
    private updatePostEmbedding;
    findPostsByUsername(username: string, page: number, page_size: number): Promise<PostListItemResponseDto[]>;
}

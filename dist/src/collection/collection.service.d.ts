import { PrismaService } from 'src/prisma.service';
import { CollectionDto } from './dto/response/collection.dto';
import { CreateCollectionDto } from './dto/request/create-collection.dto';
import { UpdateCollectionDto } from './dto/request/update-collection.dto';
export declare class CollectionService {
    private prisma;
    constructor(prisma: PrismaService);
    getUserCollections(userId: string): Promise<CollectionDto[]>;
    createCollection(dto: CreateCollectionDto, userId: string): Promise<CollectionDto>;
    updateCollection(collectionId: number, dto: UpdateCollectionDto, userId: string): Promise<CollectionDto>;
    addPostToCollection(collectionId: number, postId: number, userId: string): Promise<void>;
    removePostFromCollection(collectionId: number, postId: number, userId: string): Promise<void>;
    private findCollectionOwnedByUser;
    getCollectionDetails(collectionId: number, userId: string): Promise<CollectionDto>;
    removeCollection(collectionId: number, userId: string): Promise<void>;
}

import { CollectionService } from './collection.service';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { CollectionDto } from './dto/response/collection.dto';
import { CreateCollectionDto } from './dto/request/create-collection.dto';
import { UpdateCollectionDto } from './dto/request/update-collection.dto';
export declare class CollectionController {
    private readonly collectionService;
    constructor(collectionService: CollectionService);
    getUserCollections(user: CurrentUserType): Promise<CollectionDto[]>;
    getCollectionDetails(collectionId: number, user: CurrentUserType): Promise<CollectionDto>;
    createCollection(createCollectionDto: CreateCollectionDto, user: CurrentUserType): Promise<CollectionDto>;
    updateCollection(collectionId: number, updateCollectionDto: UpdateCollectionDto, user: CurrentUserType): Promise<CollectionDto>;
    addPostToCollection(collectionId: number, postId: number, user: CurrentUserType): Promise<void>;
    removePostFromCollection(collectionId: number, postId: number, user: CurrentUserType): Promise<void>;
    removeCollection(collectionId: number, user: CurrentUserType): Promise<void>;
}

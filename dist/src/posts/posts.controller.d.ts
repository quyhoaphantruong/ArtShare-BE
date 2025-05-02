import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/request/create-post.dto';
import { PostDetailsResponseDto } from './dto/response/post-details.dto';
import { UpdatePostDto } from './dto/request/update-post.dto';
import { PostListItemResponseDto } from './dto/response/post-list-item.dto';
import { CurrentUserType } from 'src/auth/types/current-user.type';
export declare class PostsController {
    private readonly postsService;
    constructor(postsService: PostsService);
    createPost(createPostDto: CreatePostDto, images: Express.Multer.File[], user: CurrentUserType): Promise<any>;
    updatePost(postId: number, updatePostDto: UpdatePostDto, images: Express.Multer.File[], user: CurrentUserType): Promise<PostDetailsResponseDto>;
    deletePost(postId: number): Promise<{
        title: string;
        description: string | null;
        thumbnail_url: string;
        is_mature: boolean;
        ai_created: boolean;
        id: number;
        created_at: Date;
        updated_at: Date | null;
        user_id: string;
        is_published: boolean;
        is_private: boolean;
        group_id: number | null;
        share_count: number;
        comment_count: number;
        view_count: number;
        like_count: number;
    }>;
    searchPosts(query: string, page?: string, page_size?: string): Promise<PostListItemResponseDto[]>;
    getForYouPosts(body: {
        page: number;
        page_size: number;
        filter: string[];
    }, user: CurrentUserType): Promise<PostListItemResponseDto[]>;
    getFollowingPosts(body: {
        page: number;
        page_size: number;
        filter: string[];
    }, user: CurrentUserType): Promise<PostListItemResponseDto[]>;
    getPostDetails(postId: number): Promise<PostDetailsResponseDto>;
    findPostsByUsername(username: string, page?: string, pageSize?: string): Promise<PostListItemResponseDto[]>;
}

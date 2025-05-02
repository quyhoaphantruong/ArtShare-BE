import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/request/create-blog.dto';
import { UpdateBlogDto } from './dto/request/update-blog.dto';
import { GetBlogsQueryDto } from './dto/request/get-blogs-query.dto';
import { RateBlogDto } from './dto/request/rate-blog.dto';
import { BlogListItemResponseDto } from './dto/response/blog-list-item.dto';
import { BlogDetailsResponseDto } from './dto/response/blog-details.dto';
import { BookmarkResponseDto } from './dto/response/bookmark-response.dto';
import { ProtectResponseDto } from './dto/response/protect-response.dto';
import { RatingResponseDto } from './dto/response/rating-response.dto';
import { CurrentUserType } from 'src/auth/types/current-user.type';
export declare class BlogController {
    private readonly blogService;
    constructor(blogService: BlogService);
    getBlogs(query: GetBlogsQueryDto): Promise<BlogListItemResponseDto[]>;
    getTrendingBlogs(query: GetBlogsQueryDto, user?: CurrentUserType): Promise<BlogListItemResponseDto[]>;
    getFollowingBlogs(query: GetBlogsQueryDto, user: CurrentUserType): Promise<BlogListItemResponseDto[]>;
    searchBlogs(searchQuery: string, queryDto: GetBlogsQueryDto): Promise<BlogListItemResponseDto[]>;
    findMyBlogs(user: CurrentUserType): Promise<BlogListItemResponseDto[]>;
    findBlogById(id: number, user?: CurrentUserType): Promise<BlogDetailsResponseDto>;
    createBlog(createBlogDto: CreateBlogDto, user: CurrentUserType): Promise<BlogDetailsResponseDto>;
    updateBlog(id: number, updateBlogDto: UpdateBlogDto, user: CurrentUserType): Promise<BlogDetailsResponseDto>;
    deleteBlog(id: number, user: CurrentUserType): Promise<{
        message: string;
    }>;
    toggleBookmark(id: number, user: CurrentUserType): Promise<BookmarkResponseDto>;
    protectBlog(id: number, user: CurrentUserType): Promise<ProtectResponseDto>;
    rateBlog(id: number, rateBlogDto: RateBlogDto, user: CurrentUserType): Promise<RatingResponseDto>;
}

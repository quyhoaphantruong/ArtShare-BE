import { PrismaService } from 'src/prisma.service';
import { CreateBlogDto } from './dto/request/create-blog.dto';
import { UpdateBlogDto } from './dto/request/update-blog.dto';
import { BlogListItemResponseDto } from './dto/response/blog-list-item.dto';
import { BlogDetailsResponseDto } from './dto/response/blog-details.dto';
import { BookmarkResponseDto } from './dto/response/bookmark-response.dto';
import { ProtectResponseDto } from './dto/response/protect-response.dto';
import { RatingResponseDto } from './dto/response/rating-response.dto';
export declare class BlogService {
    private prisma;
    constructor(prisma: PrismaService);
    private applyCommonBlogFilters;
    getBlogs(take: number, skip: number, search?: string): Promise<BlogListItemResponseDto[]>;
    findMyBlogs(userId: string): Promise<BlogListItemResponseDto[]>;
    createBlog(createBlogDto: CreateBlogDto, userId: string): Promise<BlogDetailsResponseDto>;
    findBlogById(id: number, requestingUserId?: string | null): Promise<BlogDetailsResponseDto | null>;
    updateBlog(id: number, updateBlogDto: UpdateBlogDto, userId: string): Promise<BlogDetailsResponseDto>;
    deleteBlog(id: number, userId: string): Promise<void>;
    getTrendingBlogs(take: number, skip: number, categories?: string[], requestingUserId?: string | null): Promise<BlogListItemResponseDto[]>;
    getFollowingBlogs(userId: string, take: number, skip: number, categories?: string[]): Promise<BlogListItemResponseDto[]>;
    toggleBookmark(blogId: number, userId: string): Promise<BookmarkResponseDto>;
    protectBlog(blogId: number, userId: string): Promise<ProtectResponseDto>;
    rateBlog(blogId: number, userId: string, ratingValue: number): Promise<RatingResponseDto>;
}

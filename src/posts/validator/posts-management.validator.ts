import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { CreatePostRequestDto } from "../dto/request/create-post.dto";

@Injectable()
export class PostsManagementValidator {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async validateCreateRequest(
    request: CreatePostRequestDto,
    images: Express.Multer.File[],
  ): Promise<{ parsedCropMeta: any }> {
    const { cate_ids = [], video_url } = request;

    console.log(request.thumbnail_crop_meta);
    // Validate and parse crop metadata
    // TODO: should define a proper type for this crop metadata
    let parsedCropMeta: any;
    try {
      parsedCropMeta = JSON.parse(request.thumbnail_crop_meta);
    } catch {
      throw new BadRequestException('Invalid thumbnail_crop_meta JSON');
    }

    // Ensure at least one media provided
    if (!video_url && images.length === 0) {
      throw new BadRequestException(
        'Provide video_url or upload at least one image',
      );
    }

    // Validate category IDs exist
    if (cate_ids.length) {
      const count = await this.prisma.category.count({
        where: { id: { in: cate_ids } },
      });
      if (count !== cate_ids.length) {
        throw new BadRequestException('One or more categories not found');
      }
    }

    return { parsedCropMeta };
  }
}

import { Controller, HttpCode, HttpStatus, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SafeSearchService } from './safe-search.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AdultDetectionReponseDto } from './dto/response/adult-detection.dto';

@Controller('safe-search')
@UseGuards(JwtAuthGuard)
export class SafeSearchController {
  constructor(private readonly safeSearchService: SafeSearchService) { }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('images', 20))
  async safeSearchInfo(
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return await this.safeSearchService.detectSafeSearchBatch(files);
  }

  @Post('detect-adult-images')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('images', 20))
  async detectAdultImages(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<AdultDetectionReponseDto[]> {
    return await this.safeSearchService.detectAdultImages(files);
  }
}

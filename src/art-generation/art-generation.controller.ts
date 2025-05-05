import { Body, Controller, Post } from '@nestjs/common';
import { ArtGenerationService } from './art-generation.service';
import { ImageGenerationDto } from './dto/request/image-generation.dto';
import { ImageGenerationResponseDto } from './dto/response/image-generation.dto';

@Controller('art-generation')
export class ArtGenerationController {
  constructor(
    private readonly artGenerationService: ArtGenerationService,
  ) { }
  
  @Post('text-to-image')
  async generateImage(
    @Body() imageGenerationDto: ImageGenerationDto
  ): Promise<ImageGenerationResponseDto> {
    return await this.artGenerationService.generateImages(imageGenerationDto);
  }
}

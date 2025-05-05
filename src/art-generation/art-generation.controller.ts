import { Body, Controller, Post } from '@nestjs/common';
import { ArtGenerationService } from './art-generation.service';
import { ImageGenerationDto } from './dto/request/image-generation.dto';
import { ImageGenerationResponseDto } from './dto/response/image-generation.dto';
import { CurrentUser } from 'src/auth/decorators/users.decorator';
import { CurrentUserType } from 'src/auth/types/current-user.type';

@Controller('art-generation')
export class ArtGenerationController {
  constructor(
    private readonly artGenerationService: ArtGenerationService,
  ) { }
  
  @Post('text-to-image')
  async generateImage(
    @Body() imageGenerationDto: ImageGenerationDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ImageGenerationResponseDto> {
    return await this.artGenerationService.generateImages(imageGenerationDto, user.id);
  }
}

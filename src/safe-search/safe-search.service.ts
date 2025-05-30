import { Injectable } from '@nestjs/common';
import { ImageAnnotatorClient, protos } from '@google-cloud/vision';
import { AdultDetectionReponseDto } from './dto/response/adult-detection.dto';
import { ISafeSearchAnnotation, Likelihood } from './types/safe-search-annotation.type';
import { plainToInstance } from 'class-transformer';
import { TryCatch } from 'src/common/try-catch.decorator';


@Injectable()
export class SafeSearchService {
  private client: ImageAnnotatorClient;

  constructor() {
    this.client = new ImageAnnotatorClient({
      apiKey: process.env.GOOGLE_VISION_API_KEY,
    });
  }

  @TryCatch()
  async detectSafeSearchBatch(
    imageFiles: Express.Multer.File[],
  ): Promise<ISafeSearchAnnotation[]> {
    const requests = imageFiles.map(({ buffer }) => ({
      image: { content: buffer },
      features: [{ type: protos.google.cloud.vision.v1.Feature.Type.SAFE_SEARCH_DETECTION }],
    }));

    const [batchResponse] = await this.client.batchAnnotateImages({
      requests,
    });

    return (batchResponse.responses ?? [])
      .map(r => r.safeSearchAnnotation)
      .filter((annotation): annotation is protos.google.cloud.vision.v1.ISafeSearchAnnotation => annotation != null);

  }

  @TryCatch()
  async detectAdultImages(
    imageFiles: Express.Multer.File[],
  ): Promise<AdultDetectionReponseDto[]> {
    console.log('detectAdultImages called with', imageFiles.length, 'files');
    const safeSearchAnnotations = await this.detectSafeSearchBatch(imageFiles);

    const response = safeSearchAnnotations.map(annotation => {
      const annotationAdult = Likelihood[annotation.adult!];
      const isAdult =
        annotationAdult == Likelihood.VERY_LIKELY ||
        annotationAdult == Likelihood.LIKELY ||
        annotationAdult == Likelihood.POSSIBLE;

      return {
        isAdult,
        annotation,
      } as AdultDetectionReponseDto;
    });

    return plainToInstance(AdultDetectionReponseDto, response)
  }
}
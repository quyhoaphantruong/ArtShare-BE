/* eslint-disable @typescript-eslint/no-require-imports */
import { Injectable } from '@nestjs/common';
import { TryCatch } from 'src/common/try-catch.decorator';
import * as transformers from '@huggingface/transformers';

@Injectable()
export class EmbeddingService {
  private processorPromise;
  private visionModelPromise;
  private tokenizerPromise;
  private textModelPromise;

  constructor() {
    const modelName = 'Xenova/clip-vit-base-patch16';

    this.processorPromise = transformers.AutoProcessor.from_pretrained(modelName, {});
    this.visionModelPromise = transformers.CLIPVisionModelWithProjection.from_pretrained(modelName);
    this.tokenizerPromise = transformers.AutoTokenizer.from_pretrained(modelName);
    this.textModelPromise = transformers.CLIPTextModelWithProjection.from_pretrained(modelName);
  }

  async generateEmbeddingFromText(text: string): Promise<number[]> {
    const tokenizer = await this.tokenizerPromise;
    const textModel = await this.textModelPromise;

    const textInputs = tokenizer([text], { padding: true, truncation: true, return_tensors: 'pt' });
    const { text_embeds } = await textModel(textInputs);

    return text_embeds.detach().cpu().numpy().flat();
  }

  async generateEmbeddingFromImageUrl(image_url: string): Promise<number[]> {
    const processor = await this.processorPromise;
    const visionModel = await this.visionModelPromise;

    try {
      const image = await processor(image_url, { return_tensors: 'pt' });
      const { image_embeds } = await visionModel(image);

      return image_embeds.detach().cpu().numpy().flat();
    } catch (err) {
      console.error(`Error processing ${image_url}:`, err);
      return [];
    }
  }

  @TryCatch()
  async generateEmbeddingFromImageBlob(imageBlob: Blob): Promise<number[]> {
    const processor = await this.processorPromise;
    const visionModel = await this.visionModelPromise;

    const image = await processor(imageBlob, { return_tensors: 'pt' });
    const { image_embeds } = await visionModel(image);

    return image_embeds.detach().cpu().numpy().flat();
  }
}

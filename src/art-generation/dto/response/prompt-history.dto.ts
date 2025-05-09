export class PromptHistoryDto {
  id: number;
  user_id: string;
  user_prompt: string;
  final_prompt: string;
  model_key: string;
  number_of_images_generated: number;
  image_urls: string[];
  aspect_ratio: string;
  style: string;
  lighting: string;
  camera: string;
  created_at: Date;
}
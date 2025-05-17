import { SharePlatform } from "src/common/enum/share-platform.enum";

export class ShareDetailsDto {
  id: number;
  user_id: string;
  post_id?: number;
  blog_id?: number;
  share_platform: SharePlatform;
  created_at: Date;
}

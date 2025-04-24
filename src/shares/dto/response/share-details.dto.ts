
export enum SharePlatform {
  FACEBOOK = 'FACEBOOK',
  GOOGLE = 'GOOGLE',
}

export class ShareDetailsDto {
  id: number;
  user_id: string;
  post_id?: number;
  blog_id?: number;
  share_platform: SharePlatform;
  created_at: Date;
}
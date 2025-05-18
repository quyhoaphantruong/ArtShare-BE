export class BlogUserInfoResponseDto {
  id: string;
  username: string;
  profile_picture_url?: string | null;
  full_name?: string | null;
  followers_count: number;
  is_following: boolean;      
}

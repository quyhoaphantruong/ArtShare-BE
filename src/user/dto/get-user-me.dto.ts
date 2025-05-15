export class UserProfileMeDTO {
  id: string;
  username: string;
  email: string;
  full_name?: string | null;
  profile_picture_url?: string | null;
  roles: string[];
  is_onboard: boolean;
}
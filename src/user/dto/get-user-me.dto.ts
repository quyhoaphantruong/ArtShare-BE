import { Role } from "src/auth/enums/role.enum";

export class UserProfileMeDTO {
  id: string; // It's good practice to return the ID as well
  username: string;
  email: string;
  full_name?: string | null;
  profile_picture_url?: string | null;
  bio?: string | null;
  followers_count: number;
  followings_count: number;
  birthday?: Date | null;
  roles: Role[];
  isFollowing: boolean;
  is_onboard: boolean;
  created_at: Date;
}
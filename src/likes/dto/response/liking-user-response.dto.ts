import { Expose } from 'class-transformer';

/**
 * DTO for returning a user who liked a blog or post.
 */
export class LikingUserResponseDto {
  /** The UUID of the user */
  @Expose()
  id: string;

  /** The user's unique username */
  @Expose()
  username: string;

  /** The user's full name */
  @Expose()
  full_name: string;

  /** URL of the user's profile picture, or null if none */
  @Expose()
  profile_picture_url: string | null;

  /** Whether the requesting user is following this user */
  @Expose()
  is_following: boolean;
}

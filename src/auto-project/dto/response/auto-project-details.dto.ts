import { AutoPostDetailsDto } from 'src/auto-post/dto/response/auto-post-details';
import { AutoProjectStatus } from 'src/auto-project/enum/auto-project-status.enum';
import { SharePlatform } from 'src/common/enum/share-platform.enum';

export class AutoProjectDetailsDto {
  id: number;
  title: string;
  description: string;
  status: AutoProjectStatus;
  platformName: SharePlatform;
  created_at: Date;
  updated_at: Date;
  userId: string;
  autoPosts: AutoPostDetailsDto[];
}

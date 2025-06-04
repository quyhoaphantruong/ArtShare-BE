import { AutoProjectStatus } from 'src/auto-project/enum/auto-project-status.enum';
import { SharePlatform } from 'src/common/enum/share-platform.enum';

export class AutoProjectListItemDto {
  id: number;
  title: string;
  description: string;
  status: AutoProjectStatus;
  platformName: SharePlatform;
  created_at: Date;
  updated_at: Date;
  userId: string;
}

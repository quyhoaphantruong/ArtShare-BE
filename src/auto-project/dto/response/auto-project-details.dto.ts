import { AutoPostDetailsDto } from 'src/auto-post/dto/response/auto-post-details';
import { AutoProjectStatus } from 'src/auto-project/enum/auto-project-status.enum';

export class AutoProjectDetailsDto {
  id: number;
  title: string;
  description: string;
  status: AutoProjectStatus;
  platform_id: number;
  created_at: Date;
  updated_at: Date;
  userId: string;
  autoPosts: AutoPostDetailsDto[];
  platform?: {
    id: number;
    name: string;
    external_page_id: string;
    config: any;
  };
}

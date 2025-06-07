import { PlatformStatus } from '@prisma/client';

export class PublicPlatformOutputDto {
  id: string;
  name: string;
  category: string;
  platform_db_id: number;
  status: PlatformStatus;
}

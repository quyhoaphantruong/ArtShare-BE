import { SharePlatform } from '@prisma/client';

export interface ApiPageData {
  id: string;
  name: string;
  access_token: string;
  category: string;
  [key: string]: any;
}

export class SyncPlatformInputDto {
  userId: string;
  platformName: SharePlatform;
  pagesFromApi: ApiPageData[];
}

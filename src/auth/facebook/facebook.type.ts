export interface PublicFacebookPageData {
  id: string;
  name: string;
  category: string;
  platform_db_id: number;
}

export interface FacebookPageApiResponseData {
  id: string;
  name: string;
  access_token: string;
  category: string;
  tasks?: string[];
}

export interface FacebookPagesApiResponse {
  data: FacebookPageApiResponseData[];
  paging?: any;
}

export interface FacebookUserTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

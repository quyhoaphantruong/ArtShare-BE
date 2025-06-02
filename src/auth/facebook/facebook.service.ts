import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  Injectable,
  Logger,
  InternalServerErrorException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { EncryptionService } from 'src/encryption/encryption.service';
import { v4 as uuidv4 } from 'uuid';

interface FacebookUserTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface AuthorizedFacebookPageData {
  id: string;
  name: string;
  accessToken: string;
  category: string;
}

interface FacebookPagesApiResponse {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    category: string;
    tasks: string[];
  }>;
  paging?: any;
}

@Injectable()
export class FacebookAuthService {
  private readonly logger = new Logger(FacebookAuthService.name);
  private readonly FB_APP_ID?: string;
  private readonly FB_APP_SECRET?: string;
  private readonly FB_REDIRECT_URI_PATH = '/facebook-integration/callback';
  private readonly FB_REDIRECT_URI: string;
  private readonly API_VERSION = 'v22.0';
  private readonly OAUTH_STATE_JWT_SECRET?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.FB_APP_ID = this.configService.get<string>('FACEBOOK_APP_ID');
    this.FB_APP_SECRET = this.configService.get<string>('FACEBOOK_APP_SECRET');
    const callbackBaseUrl =
      this.configService.get<string>('APP_URL_BASE') || 'http://localhost:3000';
    this.FB_REDIRECT_URI = `${callbackBaseUrl}${this.FB_REDIRECT_URI_PATH}`;

    this.OAUTH_STATE_JWT_SECRET =
      this.configService.get<string>('FACEBOOK_OAUTH_STATE_SECRET') ||
      this.configService.get<string>('AT_SECRET');

    if (!this.FB_APP_ID || !this.FB_APP_SECRET) {
      throw new Error('Facebook App credentials not configured.');
    }
    if (!this.OAUTH_STATE_JWT_SECRET) {
      throw new Error('Secret for Facebook OAuth State JWT not configured.');
    }
  }

  async getFacebookLoginUrl(userId: string): Promise<{ loginUrl: string }> {
    const payload = {
      sub: userId,
      nonce: uuidv4(),
      purpose: 'facebook_page_connection_state',
    };
    const stateJwt = await this.jwtService.signAsync(payload, {
      secret: this.OAUTH_STATE_JWT_SECRET,
      expiresIn: '10m',
    });

    const scopes = ['pages_show_list', 'pages_manage_posts'].join(',');
    const loginUrl = `https://www.facebook.com/${this.API_VERSION}/dialog/oauth?client_id=${this.FB_APP_ID}&redirect_uri=${encodeURIComponent(this.FB_REDIRECT_URI)}&state=${stateJwt}&scope=${scopes}&response_type=code`;

    this.logger.log(`Generated Facebook login URL for user ${userId}.`);
    return { loginUrl };
  }

  async handleFacebookCallback(
    code: string,
    receivedStateJwt: string,
  ): Promise<AuthorizedFacebookPageData> {
    let statePayload: { sub: string; purpose: string };
    try {
      statePayload = await this.jwtService.verifyAsync(receivedStateJwt, {
        secret: this.OAUTH_STATE_JWT_SECRET,
      });
      if (statePayload.purpose !== 'facebook_page_connection_state') {
        throw new Error('Invalid state JWT purpose.');
      }
      this.logger.log(
        `Valid OAuth state JWT received for user ID: ${statePayload.sub}`,
      );
    } catch (error) {
      this.logger.warn(
        '[Request ID: ${requestId}] Invalid or expired OAuth state JWT for Facebook callback:',
        (error as any).message,
      );
      throw new UnauthorizedException(
        'Invalid OAuth state. CSRF attempt or expired session.',
      );
    }

    const internalUserId = statePayload.sub;

    const tokenUrl = `https://graph.facebook.com/${this.API_VERSION}/oauth/access_token`;
    const tokenParams = {
      client_id: this.FB_APP_ID,
      redirect_uri: this.FB_REDIRECT_URI,
      client_secret: this.FB_APP_SECRET,
      code,
    };
    let userTokenResponse: FacebookUserTokenResponse;
    try {
      const response = await firstValueFrom(
        this.httpService.get<FacebookUserTokenResponse>(tokenUrl, {
          params: tokenParams,
        }),
      );
      userTokenResponse = response.data;
    } catch (error) {
      this.logger.error(
        `Error exchanging code for user token:`,
        (error as any).response?.data || (error as any).message,
      );
      throw new InternalServerErrorException(
        'Failed to get user token from Facebook.',
      );
    }

    const longLivedTokenUrl = `https://graph.facebook.com/${this.API_VERSION}/oauth/access_token`;
    const longLivedParams = {
      grant_type: 'fb_exchange_token',
      client_id: this.FB_APP_ID,
      client_secret: this.FB_APP_SECRET,
      fb_exchange_token: userTokenResponse.access_token,
    };
    let longLivedUserToken: string;
    try {
      const response = await firstValueFrom(
        this.httpService.get<FacebookUserTokenResponse>(longLivedTokenUrl, {
          params: longLivedParams,
        }),
      );
      longLivedUserToken = response.data.access_token;
    } catch (error) {
      this.logger.error(
        'Error exchanging for long-lived user token:',
        (error as any).response?.data || (error as any).message,
      );
      longLivedUserToken = userTokenResponse.access_token;
    }

    const pagesUrl = `https://graph.facebook.com/${this.API_VERSION}/me/accounts`;
    const pagesParams = {
      access_token: longLivedUserToken,
      fields: 'id,name,access_token,category,tasks',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get<FacebookPagesApiResponse>(pagesUrl, {
          params: pagesParams,
        }),
      );
      const authorizedPagesData: AuthorizedFacebookPageData[] =
        response.data.data.map((p) => ({
          id: p.id,
          name: p.name,
          accessToken: p.access_token,
          category: p.category,
        }));

      if (!authorizedPagesData || authorizedPagesData.length === 0) {
        this.logger.log(
          `User ${internalUserId} did not authorize any Facebook Pages for this app during the OAuth flow.`,
        );
      }

      this.logger.log(
        `User ${internalUserId} authorized ${authorizedPagesData.length} page(s) via Facebook UI.`,
      );

      return authorizedPagesData[0];
    } catch (error) {
      this.logger.error(
        `Error fetching or processing user's authorized pages for user ${internalUserId}:`,
        (error as any).response?.data || (error as any).message,
      );
      throw new InternalServerErrorException(
        'Failed to process authorized Facebook pages.',
      );
    }
  }
}

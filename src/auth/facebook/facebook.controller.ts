import {
  Controller,
  Get,
  Query,
  Res,
  Logger,
  UseGuards,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FacebookAuthService } from './facebook.service';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../decorators/users.decorator';
import { CurrentUserType } from '../types/current-user.type';
import { JwtAuthGuard } from '../jwt-auth.guard';

@Controller('facebook-integration')
export class FacebookController {
  private readonly logger = new Logger(FacebookController.name);
  private readonly frontendSuccessRedirectUrl: string;
  private readonly frontendErrorRedirectUrl: string;

  constructor(
    private readonly facebookAuthService: FacebookAuthService,
    private readonly configService: ConfigService,
  ) {
    this.frontendSuccessRedirectUrl =
      this.configService.get<string>('FRONTEND_URL_FB_SETUP_SUCCESS') ||
      'http://localhost:5173';
    this.frontendErrorRedirectUrl =
      this.configService.get<string>('FRONTEND_URL_FB_SETUP_ERROR') ||
      'http://localhost:5173';
  }

  /**
   * @description Called by frontend AJAX to get the Facebook redirect URL.
   * User must be logged into our application using JWT.
   */
  @UseGuards(JwtAuthGuard)
  @Get('initiate-connection-url')
  async getFacebookInitiationUrl(@CurrentUser() user: CurrentUserType) {
    const userId = user?.id;
    if (!userId) {
      this.logger.warn(
        'User ID not available from CurrentUser decorator in getFacebookInitiationUrl.',
      );
      throw new UnauthorizedException(
        'User authentication invalid or ID not available.',
      );
    }

    try {
      const { loginUrl } =
        await this.facebookAuthService.getFacebookLoginUrl(userId);
      return { facebookLoginUrl: loginUrl };
    } catch (error) {
      this.logger.error(
        `Error getting Facebook initiation URL for user ${userId}:`,
        (error as any).message,
      );
      throw new InternalServerErrorException(
        'Could not initiate Facebook connection.',
      );
    }
  }

  /**
   * @description Facebook OAuth callback endpoint. Not directly called by users.
   * This endpoint IS NOT protected by your app's AuthGuard.
   * The 'state' parameter (JWT) handles security for this callback.
   */
  @Get('callback')
  async facebookCallback(
    @Query('code') code: string,
    @Query('state') stateJwt: string,
    @Query('error') fbError: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Received State JWT: ${stateJwt}`);

    if (fbError) {
      this.logger.error(
        `Facebook callback error: ${fbError} - ${errorDescription}`,
      );
      return res.redirect(
        `${this.frontendErrorRedirectUrl}&message=${encodeURIComponent(errorDescription || 'Facebook login failed.')}`,
      );
    }

    if (!code || !stateJwt) {
      this.logger.warn(`Facebook callback missing code or state JWT.`);
      return res.redirect(
        `${this.frontendErrorRedirectUrl}&message=${encodeURIComponent('Invalid callback from Facebook.')}`,
      );
    }

    try {
      await this.facebookAuthService.handleFacebookCallback(code, stateJwt);
      this.logger.log(
        `Facebook OAuth callback processed. Attempting to redirect to success URL.`,
      );
      res.redirect(`${this.frontendSuccessRedirectUrl}`);
    } catch (error) {
      this.logger.error(
        `Error processing Facebook callback:`,
        (error as any).message,
      );
      const errorMessage =
        error instanceof UnauthorizedException
          ? 'OAuth state validation failed.'
          : (error as any).message || 'Failed to process Facebook login.';
      res.redirect(
        `${this.frontendErrorRedirectUrl}&message=${encodeURIComponent(errorMessage)}`,
      );
    }
  }
}

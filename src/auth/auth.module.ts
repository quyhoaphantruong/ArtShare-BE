import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { JwtModule } from '@nestjs/jwt';
import { AtStrategy } from './strategies/at.strategy';
import { RtStrategy } from './strategies/rt.strategy';
import { FacebookController } from './facebook/facebook.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { FacebookAuthService } from './facebook/facebook.service';
import { HttpModule } from '@nestjs/axios';
import { EncryptionService } from 'src/encryption/encryption.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('AT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('AT_EXPIRES_IN') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
    CacheModule.register({
      ttl: 600,
      isGlobal: true,
    }),
    HttpModule,
  ],
  providers: [
    AuthService,
    AtStrategy,
    RtStrategy,
    FacebookAuthService,
    EncryptionService,
  ],
  controllers: [AuthController, FacebookController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {
  constructor() {}
}

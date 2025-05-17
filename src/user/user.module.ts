import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [AuthModule, ConfigModule, StorageModule],
  controllers: [UserController],
  providers: [UserService, AuthService],
})
export class UserModule {}

import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from 'src/storage/storage.module';
import { UserAdminService } from './user.admin.service';
import { UserFollowService } from './user.follow.service';
import { UserAdminController } from './user.admin.controller';

@Module({
  imports: [AuthModule, ConfigModule, StorageModule],
  controllers: [UserController, UserAdminController],
  providers: [UserService, UserAdminService, UserFollowService, AuthService],
  exports: [UserFollowService],
})
export class UserModule {}

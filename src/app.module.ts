import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { ExampleModule } from './example/example.module';

@Module({
  imports: [ExampleModule],
  controllers: [AppController],
  providers: [AppService, PrismaService]
})
export class AppModule {}

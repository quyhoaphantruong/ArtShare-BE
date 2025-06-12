import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Global()
@Module({
  providers: [
    {
      provide: PrismaClient,
      useFactory: () => {
        console.log('✨ Creating new PrismaClient instance');
        const client = new PrismaClient({
          log:
            process.env.NODE_ENV === 'development'
              ? ['query', 'info', 'warn', 'error']
              : ['error'],
        });

        client.$connect();
        return client;
      },
    },
  ],
  exports: [PrismaClient],
})
export class PrismaModule {}

// api/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';  
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import serverlessExpress from '@codegenie/serverless-express';      

let cached: ReturnType<typeof serverlessExpress>;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!cached) {
    const app = await NestFactory.create(AppModule);
    await app.init();                   
    cached = serverlessExpress({
      app: app.getHttpAdapter().getInstance(),
    });
  }
  return cached(req, res);
}

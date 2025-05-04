import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import metadata from './metadata';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = new Logger('Bootstrap');

  // Enable CORS
  app.enableCors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // List allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
    credentials: true, // Allow cookies or authorization headers to be sent
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true, // allows "true"/"false" to become boolean
      },
      whitelist: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Art Sharing')
    .setDescription('The Art Sharing API description')
    .setVersion('1.0')
    .addTag('artsharing')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  await SwaggerModule.loadPluginMetadata(metadata);
  SwaggerModule.setup('api', app, documentFactory);

  const webhookRawBodyMiddleware = express.raw({ type: 'application/json' });
  app.use(
    '/api/stripe/webhook',
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      logger.log(`Webhook request received for path: ${req.originalUrl}`);
      webhookRawBodyMiddleware(req, res, next);
    },
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

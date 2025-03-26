import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import metadata from './metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

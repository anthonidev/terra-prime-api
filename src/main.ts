import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';

import { envs } from './config/envs';
import { getSwaggerUrl, setupSwagger } from './config/swagger.config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('SMART-API');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  setupSwagger(app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
        exposeDefaultValues: true,
      },
    }),
  );

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  await app.listen(envs.port);
  logger.log(`Server running on port ${envs.port}`);
  logger.log(`📚 API Docs: ${getSwaggerUrl()}`);
}
bootstrap();

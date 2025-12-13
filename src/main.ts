import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JSendExceptionFilter } from '@common/filters/jsend-exception.filter';
import { JSendResponseInterceptor } from '@common/interceptors/jsend-response.interceptor';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { json, urlencoded } from 'express';

import { envs } from './config/envs';
import { getSwaggerUrl, setupSwagger } from './config/swagger.config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('SMART-API');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  setupSwagger(app);

  // Global logging interceptor (logs all requests and responses)
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global JSend response interceptor (wraps all successful responses)
  app.useGlobalInterceptors(new JSendResponseInterceptor());

  // Global exception filter for JSend format (handles errors)
  app.useGlobalFilters(new JSendExceptionFilter());

  // Global validation pipe
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

void bootstrap();

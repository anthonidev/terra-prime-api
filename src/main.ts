import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { envs } from './config/envs';
import { setupSwagger, getSwaggerUrl } from './config/swagger.config';

async function bootstrap() {
  const logger = new Logger('SMART-API');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Configurar documentación Swagger/Scalar
  setupSwagger(app);

  // Configurar filtros e interceptores globales
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Configurar validación global
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

  // Configurar límites de body
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  await app.listen(envs.port);
  logger.log(`Server running on port ${envs.port}`);
  logger.log(`📚 API Docs: ${getSwaggerUrl()}`);
}
bootstrap();

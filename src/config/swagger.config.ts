import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

import { envs } from './envs';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Smart API')
    .setDescription('API REST para gestión de proyectos inmobiliarios')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa el token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addSecurity('JWT-auth', {
      type: 'http',
      scheme: 'bearer',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  app.use(
    '/docs',
    apiReference({
      theme: 'purple',
      showDeveloperTools: 'never',
      hiddenClients: true,
      hideModels: true,
      hideDownloadButton: true,
      spec: {
        content: document,
      },
    }),
  );
}

export function getSwaggerUrl(): string {
  return `http://localhost:${envs.port}/docs`;
}

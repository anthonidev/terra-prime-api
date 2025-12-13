import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { envs } from './envs';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Terra Prime API')
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
    .addTag('Users', 'Gestión de usuarios del sistema')
    .addTag('Roles', 'Gestión de roles y permisos')
    .addTag('Views', 'Gestión de vistas/menú del sistema')
    .addTag('Profile', 'Gestión del perfil de usuario')
    .addTag(
      'Autenticación',
      'Endpoints públicos para login, registro y refresh token',
    )
    .addTag(
      'Cambio de contraseña',
      'Cambio de contraseña para usuarios autenticados',
    )
    .addTag(
      'Restablecimiento de contraseña',
      'Recuperación de contraseña olvidada',
    )
    .addTag('Proyectos', 'Gestión de proyectos inmobiliarios')
    .addTag('Etapas', 'Gestión de etapas dentro de proyectos')
    .addTag('Manzanas', 'Gestión de manzanas dentro de etapas')
    .addTag('Lotes', 'Gestión de lotes y tokens administrativos')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  app.use(
    '/docs',
    apiReference({
      theme: 'purple',
      showDeveloperTools: false,
      hiddenClients: true,
      hideModels: true,
      hideDownloadButton: true,
      spec: {
        content: document,
      },
    } as any),
  );
}

export function getSwaggerUrl(): string {
  return `http://localhost:${envs.port}/docs`;
}

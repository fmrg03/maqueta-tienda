import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Headers de seguridad HTTP (X-Content-Type-Options, X-Frame-Options,
  // Strict-Transport-Security, Content-Security-Policy, y esconde
  // X-Powered-By) — encontrado como gap real en el pentest interno, ver
  // ARCHITECTURE.md sección 6.
  app.use(helmet());

  // Whitelist estricta: rechaza cualquier propiedad no declarada en el DTO
  // (ver ARCHITECTURE.md, sección Seguridad > Sanitización y validación).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Formato de error único en toda la API — ver el filtro para el detalle.
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS restringido por variable de entorno, no wildcard (también
  // encontrado en el pentest). CORS_ORIGIN acepta uno o varios orígenes
  // separados por coma. Default a localhost:3000 (Next.js en dev) — hay
  // que actualizar CORS_ORIGIN en producción con el dominio real del
  // frontend una vez que exista.
  const origenesPermitidos = (
    process.env.CORS_ORIGIN ?? 'http://localhost:3000'
  )
    .split(',')
    .map((origen) => origen.trim());
  app.enableCors({ origin: origenesPermitidos });

  // Swagger solo se expone fuera de producción — es documentación interna
  // de desarrollo, no un endpoint pensado para estar público.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Maqueta Tienda API')
      .setDescription(
        'API de la app web de construcción: inventario, catálogo, carrito de consulta y asesorías. Ver docs/ARCHITECTURE.md en el repo para el diseño completo.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();

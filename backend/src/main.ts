import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  app.enableCors();

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

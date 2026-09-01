import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { CatalogoModule } from './modules/catalogo/catalogo.module';
import { CarritoModule } from './modules/carrito/carrito.module';
import { AsesoriasModule } from './modules/asesorias/asesorias.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      // synchronize solo en desarrollo — en producción se maneja con
      // migraciones explícitas de TypeORM.
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    UsuariosModule,
    AuthModule,
    ProveedoresModule,
    InventarioModule,
    CatalogoModule,
    CarritoModule,
    AsesoriasModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

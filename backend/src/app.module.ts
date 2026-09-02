import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { CatalogoModule } from './modules/catalogo/catalogo.module';
import { CarritoModule } from './modules/carrito/carrito.module';
import { AsesoriasModule } from './modules/asesorias/asesorias.module';
import { RlsInterceptor } from './common/rls/rls.interceptor';
import { HealthModule } from './health/health.module';
import { RedisModule } from './common/redis/redis.module';

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
    // Storage en Redis (no en memoria): con más de una instancia del
    // backend corriendo, un store en memoria haría que cada instancia
    // lleve su propio contador — el límite efectivo se multiplicaría por
    // la cantidad de instancias (ver ARCHITECTURE.md sección 5).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      storage: new ThrottlerStorageRedisService(
        process.env.REDIS_URL ?? 'redis://localhost:6379',
      ),
    }),
    RedisModule,
    UsuariosModule,
    AuthModule,
    ProveedoresModule,
    InventarioModule,
    CatalogoModule,
    CarritoModule,
    AsesoriasModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: RlsInterceptor },
  ],
})
export class AppModule {}

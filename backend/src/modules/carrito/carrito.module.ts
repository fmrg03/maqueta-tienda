import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SolicitudCarrito,
  ItemSolicitudCarrito,
  ServicioSolicitud,
  PagoSolicitud,
} from './entities/solicitud-carrito.entity';
import { EventoSolicitudCarrito } from './entities/evento-solicitud-carrito.entity';
import { CarritoService } from './carrito.service';
import { CarritoController } from './carrito.controller';
import { TasasModule } from '../tasas/tasas.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { InventarioModule } from '../inventario/inventario.module';
import { NotificacionesModule } from '../../common/notificaciones/notificaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SolicitudCarrito, ItemSolicitudCarrito, ServicioSolicitud, PagoSolicitud, EventoSolicitudCarrito]),
    InventarioModule,
    TasasModule,
    ConfiguracionModule,
    NotificacionesModule,
  ],
  controllers: [CarritoController],
  providers: [CarritoService],
  exports: [CarritoService],
})
export class CarritoModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SolicitudCarrito,
  ItemSolicitudCarrito,
} from './entities/solicitud-carrito.entity';
import { EventoSolicitudCarrito } from './entities/evento-solicitud-carrito.entity';
import { CarritoService } from './carrito.service';
import { CarritoController } from './carrito.controller';
import { InventarioModule } from '../inventario/inventario.module';
import { NotificacionesModule } from '../../common/notificaciones/notificaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SolicitudCarrito, ItemSolicitudCarrito, EventoSolicitudCarrito]),
    InventarioModule,
    NotificacionesModule,
  ],
  controllers: [CarritoController],
  providers: [CarritoService],
})
export class CarritoModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Presupuesto, PresupuestoItem } from './entities/presupuesto.entity';
import { Servicio } from './entities/servicio.entity';
import { PresupuestosService } from './presupuestos.service';
import { ServiciosService } from './servicios.service';
import { PresupuestoPublicoController, PresupuestosController } from './presupuestos.controller';
import { ServiciosController } from './servicios.controller';
import { CarritoModule } from '../carrito/carrito.module';
import { TasasModule } from '../tasas/tasas.module';

@Module({
  imports: [TypeOrmModule.forFeature([Presupuesto, PresupuestoItem, Servicio]), CarritoModule, TasasModule],
  controllers: [PresupuestosController, PresupuestoPublicoController, ServiciosController],
  providers: [PresupuestosService, ServiciosService],
})
export class PresupuestosModule {}

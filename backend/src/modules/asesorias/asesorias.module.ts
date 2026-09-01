import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Asesor,
  DisponibilidadAsesor,
  SolicitudAsesoria,
} from './entities/asesoria.entity';
import { AsesoresService } from './asesores.service';
import { AsesoresController } from './asesores.controller';
import { AsesoriasService } from './asesorias.service';
import { AsesoriasController } from './asesorias.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { NotificacionesModule } from '../../common/notificaciones/notificaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asesor, DisponibilidadAsesor, SolicitudAsesoria]),
    UsuariosModule,
    NotificacionesModule,
  ],
  controllers: [AsesoresController, AsesoriasController],
  providers: [AsesoresService, AsesoriasService],
})
export class AsesoriasModule {}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Asesor,
  DisponibilidadAsesor,
  EstadoSolicitudAsesoria,
  SolicitudAsesoria,
} from './entities/asesoria.entity';
import { CrearSolicitudAsesoriaDto } from './dto/crear-solicitud-asesoria.dto';
import { RegistrarLlamadaDto } from './dto/registrar-llamada.dto';
import { NotificacionesService } from '../../common/notificaciones/notificaciones.service';
import { getRlsManager } from '../../common/rls/request-context';

@Injectable()
export class AsesoriasService {
  constructor(
    @InjectRepository(SolicitudAsesoria)
    private readonly solicitudRepositoryInyectado: Repository<SolicitudAsesoria>,
    @InjectRepository(Asesor)
    private readonly asesorRepository: Repository<Asesor>,
    private readonly dataSource: DataSource,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  // `solicitudes_asesoria` tiene RLS (ver migración AddRowLevelSecurity):
  // admin ve todas, cada asesor solo ve las suyas.
  private get solicitudRepository(): Repository<SolicitudAsesoria> {
    return (
      getRlsManager()?.getRepository(SolicitudAsesoria) ??
      this.solicitudRepositoryInyectado
    );
  }

  /**
   * Reserva la franja de `DisponibilidadAsesor` y crea la SolicitudAsesoria
   * en una misma transacción con lock pesimista sobre la franja — misma
   * técnica que InventarioService.registrarMovimiento — para evitar que
   * dos clientes reserven el mismo horario si llegan casi al mismo tiempo.
   * El constraint único (asesor + fechaHora) es la segunda línea de defensa
   * a nivel de base de datos.
   */
  async crearSolicitud(dto: CrearSolicitudAsesoriaDto): Promise<SolicitudAsesoria> {
    const fechaHoraLlamada = new Date(dto.fechaHoraLlamada);

    const solicitud = await this.dataSource.transaction(async (manager) => {
      const asesor = await manager
        .getRepository(Asesor)
        .findOne({ where: { id: dto.asesorId } });
      if (!asesor) {
        throw new NotFoundException(`Asesor ${dto.asesorId} no encontrado`);
      }

      const franja = await manager
        .getRepository(DisponibilidadAsesor)
        .createQueryBuilder('disponibilidad')
        .setLock('pessimistic_write')
        .where('disponibilidad.asesorId = :asesorId', { asesorId: dto.asesorId })
        .andWhere('disponibilidad.fechaHora = :fechaHora', { fechaHora: fechaHoraLlamada })
        .getOne();

      if (!franja) {
        throw new NotFoundException(
          'No existe esa franja de disponibilidad para el asesor seleccionado',
        );
      }
      if (!franja.disponible) {
        throw new ConflictException('Esa franja ya fue reservada por otro cliente');
      }

      franja.disponible = false;
      await manager.getRepository(DisponibilidadAsesor).save(franja);

      // El INSERT de TypeORM siempre agrega RETURNING para leer columnas
      // generadas. Postgres exige que la fila insertada también pase una
      // política de SELECT para devolverla — no alcanza con que el INSERT
      // esté permitido. Esta solicitud viene de un endpoint público (sin
      // sesión), así que no hay forma de que pase la política normal
      // (admin o el propio asesor); reusamos el mismo contexto
      // 'service_auth' que usuarios.service.ts usa para login/registro.
      await manager.query(`SELECT set_config('app.rol', 'service_auth', true)`);

      const nuevaSolicitud = manager.getRepository(SolicitudAsesoria).create({
        clienteNombre: dto.clienteNombre,
        clienteTelefono: dto.clienteTelefono,
        clienteEmail: dto.clienteEmail,
        asesor,
        fechaHoraLlamada,
        estado: EstadoSolicitudAsesoria.PENDIENTE,
      });

      return manager.getRepository(SolicitudAsesoria).save(nuevaSolicitud);
    });

    await this.notificacionesService.notificarNuevaSolicitudAsesoria(solicitud.id);
    return solicitud;
  }

  async findAll(estado?: EstadoSolicitudAsesoria): Promise<SolicitudAsesoria[]> {
    return this.solicitudRepository.find({
      where: estado ? { estado } : {},
      order: { fechaHoraLlamada: 'ASC' },
    });
  }

  async findOne(id: string): Promise<SolicitudAsesoria> {
    const solicitud = await this.solicitudRepository.findOne({ where: { id } });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud de asesoría ${id} no encontrada`);
    }
    return solicitud;
  }

  async registrarLlamada(
    id: string,
    dto: RegistrarLlamadaDto,
  ): Promise<SolicitudAsesoria> {
    const solicitud = await this.transicionar(id, EstadoSolicitudAsesoria.LLAMADA_REALIZADA, [
      EstadoSolicitudAsesoria.PENDIENTE,
    ]);
    if (dto.notasLlamada) {
      solicitud.notasLlamada = dto.notasLlamada;
    }
    return this.solicitudRepository.save(solicitud);
  }

  async marcarVisitaPactada(id: string): Promise<SolicitudAsesoria> {
    return this.transicionar(id, EstadoSolicitudAsesoria.VISITA_PACTADA, [
      EstadoSolicitudAsesoria.LLAMADA_REALIZADA,
    ]);
  }

  async marcarNoProcede(id: string): Promise<SolicitudAsesoria> {
    return this.transicionar(id, EstadoSolicitudAsesoria.NO_PROCEDE, [
      EstadoSolicitudAsesoria.LLAMADA_REALIZADA,
    ]);
  }

  async cancelar(id: string): Promise<SolicitudAsesoria> {
    const solicitud = await this.findOne(id);
    solicitud.estado = EstadoSolicitudAsesoria.CANCELADA;
    return this.solicitudRepository.save(solicitud);
  }

  private async transicionar(
    id: string,
    nuevoEstado: EstadoSolicitudAsesoria,
    estadosPermitidosDesde: EstadoSolicitudAsesoria[],
  ): Promise<SolicitudAsesoria> {
    const solicitud = await this.findOne(id);

    if (!estadosPermitidosDesde.includes(solicitud.estado)) {
      throw new BadRequestException(
        `No se puede pasar de estado "${solicitud.estado}" a "${nuevoEstado}"`,
      );
    }

    solicitud.estado = nuevoEstado;
    return this.solicitudRepository.save(solicitud);
  }
}

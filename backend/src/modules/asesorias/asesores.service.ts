import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asesor, DisponibilidadAsesor } from './entities/asesoria.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CrearDisponibilidadDto } from './dto/crear-disponibilidad.dto';
import { getRlsManager } from '../../common/rls/request-context';

// Lo único que el público puede ver de un asesor: nada de email, teléfono
// ni datos de la cuenta de usuario.
export interface AsesorPublico {
  id: string;
  nombre: string;
  especialidad: string | null;
}

@Injectable()
export class AsesoresService {
  constructor(
    @InjectRepository(Asesor)
    private readonly asesorRepository: Repository<Asesor>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(DisponibilidadAsesor)
    private readonly disponibilidadRepository: Repository<DisponibilidadAsesor>,
  ) {}

  async crearAsesor(usuarioId: string, especialidad?: string): Promise<Asesor> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario ${usuarioId} no encontrado`);
    }

    const asesor = this.asesorRepository.create({ usuario, especialidad });
    return this.asesorRepository.save(asesor);
  }

  async findAll(): Promise<Asesor[]> {
    return this.asesorRepository.find({ where: { activo: true } });
  }

  /**
   * Listado PÚBLICO para que el cliente elija con quién agendar la llamada.
   * Los nombres viven en `usuarios` (RLS: cada quien ve solo su fila), y acá
   * no hay sesión, así que se usa el contexto acotado 'service_auth' — con
   * una consulta fija que devuelve únicamente id, nombre y especialidad.
   */
  async listarPublicos(): Promise<AsesorPublico[]> {
    const manager = getRlsManager();
    if (manager) {
      await manager.query(`SELECT set_config('app.rol', 'service_auth', true)`);
    }
    return (manager ?? this.asesorRepository.manager).query(
      `SELECT a.id, u.nombre, a.especialidad
         FROM asesores a
         JOIN usuarios u ON u.id = a."usuarioId"
        WHERE a.activo = true AND u.activo = true
        ORDER BY u.nombre ASC`,
    );
  }

  async findOne(id: string): Promise<Asesor> {
    const asesor = await this.asesorRepository.findOne({ where: { id } });
    if (!asesor) {
      throw new NotFoundException(`Asesor ${id} no encontrado`);
    }
    return asesor;
  }

  async agregarDisponibilidad(
    asesorId: string,
    dto: CrearDisponibilidadDto,
  ): Promise<DisponibilidadAsesor> {
    const asesor = await this.findOne(asesorId);

    const fechaHora = new Date(dto.fechaHora);
    const existente = await this.disponibilidadRepository.findOne({
      where: { asesor: { id: asesorId }, fechaHora },
    });
    if (existente) {
      throw new ConflictException(
        'Ya existe una franja de disponibilidad para ese asesor en ese horario',
      );
    }

    const disponibilidad = this.disponibilidadRepository.create({
      asesor,
      fechaHora,
      disponible: true,
    });
    return this.disponibilidadRepository.save(disponibilidad);
  }

  // Franjas libres de un asesor a partir de una fecha (para que el cliente
  // elija; el frontend convierte a America/Caracas solo al mostrar).
  async disponibilidadLibre(
    asesorId: string,
    desde: Date,
    hasta?: Date,
  ): Promise<DisponibilidadAsesor[]> {
    const query = this.disponibilidadRepository
      .createQueryBuilder('disponibilidad')
      .where('disponibilidad.asesorId = :asesorId', { asesorId })
      .andWhere('disponibilidad.disponible = true')
      .andWhere('disponibilidad.fechaHora >= :desde', { desde });

    if (hasta) {
      query.andWhere('disponibilidad.fechaHora < :hasta', { hasta });
    }

    return query.orderBy('disponibilidad.fechaHora', 'ASC').getMany();
  }
}

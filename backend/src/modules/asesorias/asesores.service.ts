import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asesor, DisponibilidadAsesor } from './entities/asesoria.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CrearDisponibilidadDto } from './dto/crear-disponibilidad.dto';

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

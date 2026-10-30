import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asesor, DisponibilidadAsesor } from './entities/asesoria.entity';
import { RolUsuario, Usuario } from '../usuarios/entities/usuario.entity';
import { UsuariosService } from '../usuarios/usuarios.service';
import { CrearAsesorDto } from './dto/crear-asesor.dto';
import { ActualizarAsesorDto } from './dto/actualizar-asesor.dto';
import { DisponibilidadLoteDto } from './dto/disponibilidad-lote.dto';
import { CrearDisponibilidadDto } from './dto/crear-disponibilidad.dto';
import { getRlsManager } from '../../common/rls/request-context';

// Lo único que el público puede ver de un asesor: nada de email, teléfono
// ni datos de la cuenta de usuario.
export interface AsesorAdmin {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  especialidad: string | null;
  activo: boolean;
  franjasLibres: number;
  asesoriasPendientes: number;
}

export interface FranjaAdmin {
  id: string;
  fechaHora: string;
  disponible: boolean;
  solicitudId: string | null;
  clienteNombre: string | null;
}

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
    private readonly usuariosService: UsuariosService,
  ) {}

  /** `usuarios` y `solicitudes_asesoria` tienen RLS: el panel las lee con la sesión del admin. */
  private get manager() {
    return getRlsManager() ?? this.asesorRepository.manager;
  }

  async listarAdmin(estado: 'activos' | 'inactivos' | 'todos' = 'activos'): Promise<AsesorAdmin[]> {
    const filtro =
      estado === 'activos' ? 'WHERE a.activo AND u.activo'
      : estado === 'inactivos' ? 'WHERE NOT (a.activo AND u.activo)'
      : '';
    return this.manager.query(
      `SELECT a.id, u.nombre, u.email, u.telefono, a.especialidad,
              (a.activo AND u.activo) AS activo,
              (SELECT count(*)::int FROM disponibilidad_asesor d
                WHERE d."asesorId" = a.id AND d.disponible AND d."fechaHora" >= now()) AS "franjasLibres",
              (SELECT count(*)::int FROM solicitudes_asesoria s
                WHERE s."asesorId" = a.id AND s.estado = 'pendiente') AS "asesoriasPendientes"
         FROM asesores a JOIN usuarios u ON u.id = a."usuarioId"
         ${filtro}
        ORDER BY u.nombre ASC`,
    );
  }

  async actualizar(id: string, dto: ActualizarAsesorDto): Promise<Asesor> {
    await this.findOne(id);
    // UPDATE solo de lo que cambia. NO usar save(asesor): `usuario` es una
    // relación eager protegida por RLS; cargada sin sesión llega null y el
    // save() la escribiría como NULL, dejando al asesor sin cuenta.
    const cambios: Partial<Pick<Asesor, 'especialidad' | 'activo'>> = {};
    if (dto.especialidad !== undefined) cambios.especialidad = dto.especialidad || undefined;
    if (dto.activo !== undefined) cambios.activo = dto.activo;
    if (Object.keys(cambios).length > 0) {
      await this.asesorRepository.update({ id }, cambios);
    }
    return this.findOne(id);
  }

  /** Agenda completa (libres y reservadas) desde ahora, con el cliente que reservó. */
  async agenda(asesorId: string): Promise<FranjaAdmin[]> {
    await this.findOne(asesorId);
    return this.manager.query(
      `SELECT d.id, d."fechaHora", d.disponible, s.id AS "solicitudId", s."clienteNombre"
         FROM disponibilidad_asesor d
         LEFT JOIN solicitudes_asesoria s
           ON s."asesorId" = d."asesorId" AND s."fechaHoraLlamada" = d."fechaHora" AND s.estado <> 'cancelada'
        WHERE d."asesorId" = $1 AND d."fechaHora" >= now() - interval '1 day'
        ORDER BY d."fechaHora" ASC`,
      [asesorId],
    );
  }

  /** Crea muchas franjas de una vez; las que ya existían se omiten (no es error). */
  async agregarDisponibilidadLote(
    asesorId: string,
    dto: DisponibilidadLoteDto,
  ): Promise<{ creadas: number; omitidas: number }> {
    const asesor = await this.findOne(asesorId);
    const fechas = [...new Set(dto.fechasHora.map((f) => new Date(f).getTime()))].map((t) => new Date(t));
    if (fechas.some((f) => f.getTime() <= Date.now())) {
      throw new BadRequestException('No se pueden crear horarios que ya pasaron');
    }
    const filas = await this.manager.query(
      `INSERT INTO disponibilidad_asesor ("asesorId", "fechaHora", disponible)
       SELECT $1, f, true FROM unnest($2::timestamptz[]) AS f
       ON CONFLICT ON CONSTRAINT uq_asesor_fecha_hora DO NOTHING
       RETURNING id`,
      [asesor.id, fechas],
    );
    return { creadas: filas.length, omitidas: fechas.length - filas.length };
  }

  /** Solo se borra una franja libre; si ya tiene un cliente se cancela/reagenda la asesoría. */
  async eliminarFranja(franjaId: string): Promise<void> {
    const franja = await this.disponibilidadRepository.findOne({ where: { id: franjaId } });
    if (!franja) throw new NotFoundException(`Franja ${franjaId} no encontrada`);
    if (!franja.disponible) {
      throw new ConflictException('Esa franja ya está reservada por un cliente; cancela o reagenda su asesoría primero');
    }
    await this.disponibilidadRepository.delete({ id: franjaId });
  }

  async crearAsesor(datos: CrearAsesorDto): Promise<Asesor> {
    let usuario: Usuario;
    if (datos.usuarioId) {
      // `usuarios` tiene RLS: hay que leerla con la sesión del admin (RLS manager);
      // con el repositorio inyectado (sin sesión) la fila nunca aparece.
      const usuarioRepo = getRlsManager()?.getRepository(Usuario) ?? this.usuarioRepository;
      const existente = await usuarioRepo.findOne({ where: { id: datos.usuarioId } });
      if (!existente) {
        throw new NotFoundException(`Usuario ${datos.usuarioId} no encontrado`);
      }
      usuario = existente;
    } else {
      // Cuenta nueva con rol asesor (la request ya corre en una transacción:
      // si algo falla después, no queda la cuenta huérfana).
      usuario = await this.usuariosService.create({
        nombre: datos.nombre!,
        email: datos.email!,
        password: datos.password!,
        rol: RolUsuario.ASESOR,
        telefono: datos.telefono,
      });
    }

    // Misma transacción que la creación de la cuenta: con el repositorio sin
    // sesión, la cuenta recién creada (aún sin confirmar) no existe y el FK falla.
    const asesorRepo = getRlsManager()?.getRepository(Asesor) ?? this.asesorRepository;
    const yaEs = await asesorRepo.findOne({ where: { usuario: { id: usuario.id } } });
    if (yaEs) {
      throw new ConflictException('Esa cuenta ya es un asesor');
    }

    const asesor = asesorRepo.create({ usuario, especialidad: datos.especialidad });
    return asesorRepo.save(asesor);
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
    const repo = getRlsManager()?.getRepository(Asesor) ?? this.asesorRepository;
    const asesor = await repo.findOne({ where: { id } });
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

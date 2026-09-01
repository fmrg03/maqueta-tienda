import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('asesores')
export class Asesor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Usuario, { eager: true, onDelete: 'CASCADE' })
  usuario: Usuario;

  @Column({ type: 'varchar', length: 150, nullable: true })
  especialidad?: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => DisponibilidadAsesor, (d) => d.asesor)
  disponibilidad: DisponibilidadAsesor[];
}

export enum EstadoSolicitudAsesoria {
  PENDIENTE = 'pendiente',
  LLAMADA_REALIZADA = 'llamada_realizada',
  VISITA_PACTADA = 'visita_pactada',
  NO_PROCEDE = 'no_procede',
  CANCELADA = 'cancelada',
}

// Todas las fechas/horas de este módulo se manejan en UTC (timestamptz) y
// se normalizan a America/Caracas únicamente en la capa de presentación
// (frontend) — ver ARCHITECTURE.md, sección Modelo de Datos.
@Entity('disponibilidad_asesor')
@Unique('uq_asesor_fecha_hora', ['asesor', 'fechaHora'])
export class DisponibilidadAsesor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asesor, (asesor) => asesor.disponibilidad, {
    onDelete: 'CASCADE',
  })
  asesor: Asesor;

  @Column({ type: 'timestamptz' })
  fechaHora: Date;

  // Al reservarse una SolicitudAsesoria sobre esta franja, pasa a false.
  // El constraint único (asesor + fechaHora) + lock pesimista al reservar
  // (ver AsesoriasService.reservarFranja) evitan doble booking.
  @Column({ type: 'boolean', default: true })
  disponible: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

@Entity('solicitudes_asesoria')
export class SolicitudAsesoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  clienteNombre: string;

  @Column({ type: 'varchar', length: 30 })
  clienteTelefono: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  clienteEmail?: string;

  @ManyToOne(() => Asesor, { eager: true, nullable: true, onDelete: 'SET NULL' })
  asesor?: Asesor;

  // Franja agendada para la llamada/videollamada de primer contacto por
  // WhatsApp (no una visita — ver ARCHITECTURE.md, sección Contratos de API).
  @Column({ type: 'timestamptz' })
  fechaHoraLlamada: Date;

  @Column({
    type: 'enum',
    enum: EstadoSolicitudAsesoria,
    default: EstadoSolicitudAsesoria.PENDIENTE,
  })
  estado: EstadoSolicitudAsesoria;

  @Column({ type: 'text', nullable: true })
  notasLlamada?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

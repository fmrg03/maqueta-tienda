import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { SolicitudCarrito } from './solicitud-carrito.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export type TipoEventoCarrito =
  | 'estado'
  | 'items_editados'
  | 'detalle_enviado'
  | 'pendiente_stock'
  | 'cerrada'
  | 'cancelada'
  | 'anulada';

/** Historial de la solicitud: quién hizo qué y cuándo (auditoría de dinero). */
@Entity('eventos_solicitud_carrito')
export class EventoSolicitudCarrito {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SolicitudCarrito, { onDelete: 'CASCADE' })
  solicitud: SolicitudCarrito;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL', eager: true })
  usuario?: Usuario | null;

  @Column({ type: 'varchar', length: 40 })
  tipo: TipoEventoCarrito;

  @Column({ type: 'jsonb', nullable: true })
  detalle?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

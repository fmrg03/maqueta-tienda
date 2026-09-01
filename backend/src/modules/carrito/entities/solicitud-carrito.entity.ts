import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Material } from '../../inventario/entities/material.entity';
import { VarianteMaterial } from '../../inventario/entities/variante-material.entity';
import { Combo } from '../../inventario/entities/combo.entity';

export enum EstadoSolicitudCarrito {
  NUEVA = 'nueva',
  CONTACTADO = 'contactado',
  CERRADA = 'cerrada',
}

export enum CanalEnvio {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  FORMULARIO = 'formulario',
}

@Entity('solicitudes_carrito')
export class SolicitudCarrito {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  clienteNombre: string;

  @Column({ type: 'varchar', length: 30 })
  clienteTelefono: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  clienteEmail?: string;

  @OneToMany(() => ItemSolicitudCarrito, (item) => item.solicitud, {
    cascade: true,
  })
  items: ItemSolicitudCarrito[];

  @Column({
    type: 'enum',
    enum: EstadoSolicitudCarrito,
    default: EstadoSolicitudCarrito.NUEVA,
  })
  estado: EstadoSolicitudCarrito;

  @Column({ type: 'enum', enum: CanalEnvio, default: CanalEnvio.WHATSAPP })
  canalEnvio: CanalEnvio;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

@Entity('items_solicitud_carrito')
export class ItemSolicitudCarrito {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SolicitudCarrito, (solicitud) => solicitud.items, {
    onDelete: 'CASCADE',
  })
  solicitud: SolicitudCarrito;

  @ManyToOne(() => Material, { nullable: true, eager: true })
  material?: Material;

  @ManyToOne(() => VarianteMaterial, { nullable: true, eager: true })
  variante?: VarianteMaterial;

  @ManyToOne(() => Combo, { nullable: true, eager: true })
  combo?: Combo;

  @Column({ type: 'int' })
  cantidad: number;
}

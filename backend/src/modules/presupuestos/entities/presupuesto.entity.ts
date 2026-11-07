import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { TipoLinea } from '../presupuesto-calculos';

export type EstadoPresupuesto = 'borrador' | 'enviado' | 'aprobado' | 'rechazado' | 'convertido';
export const ESTADOS_PRESUPUESTO: EstadoPresupuesto[] = ['borrador', 'enviado', 'aprobado', 'rechazado', 'convertido'];

const decimal = {
  to: (v: number) => v,
  from: (v: string | null) => (v === null || v === undefined ? v : Number(v)),
};

@Entity('presupuestos')
export class Presupuesto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Correlativo legible; lo asigna la base de datos.
  @Column({ type: 'int', insert: false, update: false })
  numero: number;

  // Token del enlace público al PDF (lo asigna la base de datos).
  @Column({ type: 'uuid', insert: false, update: false, select: false })
  tokenPublico: string;

  @Column({ type: 'varchar', length: 150 })
  clienteNombre: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  clienteTelefono?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  clienteEmail?: string | null;

  // Obra o ubicación del trabajo.
  @Column({ type: 'varchar', length: 200, nullable: true })
  obra?: string | null;

  @Column({ type: 'text', nullable: true })
  notas?: string | null;

  @Column({ type: 'int', default: 15 })
  validezDias: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, transformer: decimal })
  descuentoPct: number;

  @Column({ type: 'varchar', length: 20, default: 'borrador' })
  estado: EstadoPresupuesto;

  // Solicitud de carrito creada al convertir el presupuesto.
  @Column({ type: 'uuid', nullable: true })
  solicitudId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  creadoPorId?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  creadoPorNombre?: string | null;

  @OneToMany(() => PresupuestoItem, (i) => i.presupuesto, { cascade: true })
  items: PresupuestoItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('presupuesto_items')
export class PresupuestoItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Presupuesto, (p) => p.items, { onDelete: 'CASCADE' })
  presupuesto: Presupuesto;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'varchar', length: 10 })
  tipo: TipoLinea;

  @Column({ type: 'uuid', nullable: true })
  varianteId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  comboId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  servicioId?: string | null;

  @Column({ type: 'varchar', length: 300 })
  descripcion: string;

  @Column({ type: 'varchar', length: 30, default: 'unidad' })
  unidad: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimal })
  cantidad: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimal })
  precioUnitario: number;

  // Precio en divisas de la unidad (productos y combos). null = igual a precioUnitario.
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: decimal })
  precioDivisasUnitario?: number | null;
}

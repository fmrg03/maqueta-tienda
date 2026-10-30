import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { VarianteMaterial } from './variante-material.entity';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoMovimiento {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
}

@Entity('movimientos_inventario')
export class MovimientoInventario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => VarianteMaterial, { eager: true, onDelete: 'RESTRICT' })
  variante: VarianteMaterial;

  @Column({ type: 'enum', enum: TipoMovimiento })
  tipo: TipoMovimiento;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'varchar', length: 300, nullable: true })
  motivo?: string;

  // Precios congelados al momento de la venta: el reporte de ganancias no
  // debe cambiar si mañana se edita el precio de la variante.
  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true })
  precioVentaUnitario?: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true })
  precioCostoUnitario?: number | null;

  // Venta del carrito que originó el movimiento (FK en la migración; sin
  // relación TypeORM para evitar el import circular carrito ↔ inventario).
  @Column({ type: 'uuid', nullable: true })
  solicitudId?: string | null;

  // A quién se le compró (solo entradas). El costo pagado va en precioCostoUnitario.
  @Column({ type: 'uuid', nullable: true })
  proveedorId?: string | null;

  @ManyToOne(() => Proveedor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'proveedorId' })
  proveedor?: Proveedor | null;

  @ManyToOne(() => Usuario, { eager: true, onDelete: 'SET NULL', nullable: true })
  usuario?: Usuario;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

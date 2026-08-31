import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { VarianteMaterial } from './variante-material.entity';
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

  @ManyToOne(() => Usuario, { eager: true, onDelete: 'SET NULL', nullable: true })
  usuario?: Usuario;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

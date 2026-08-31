import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Material } from './material.entity';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';

@Entity('material_proveedor')
export class MaterialProveedor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Material, { onDelete: 'CASCADE' })
  material: Material;

  @ManyToOne(() => Proveedor, { eager: true, onDelete: 'CASCADE' })
  proveedor: Proveedor;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioCostoProveedor: number;

  @Column({ type: 'int', default: 0 })
  tiempoEntregaDias: number;
}

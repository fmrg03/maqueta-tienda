import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
} from 'typeorm';
import { Material } from './material.entity';

@Entity('variantes_material')
export class VarianteMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Material, (material) => material.variantes, {
    onDelete: 'CASCADE',
  })
  material: Material;

  // Atributos dinámicos: { color: 'gris', tamano: '25kg' }, etc.
  @Column({ type: 'jsonb', default: {} })
  atributos: Record<string, string>;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 60 })
  skuVariante: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  // Precio de venta y costo viven acá, no en Material: dos presentaciones
  // del mismo producto (ej. cemento 25kg vs 50kg) casi nunca cuestan lo
  // mismo, ni al comprarlo ni al venderlo — el precio es un atributo de
  // la presentación específica, no del "producto en general".
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioVenta: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioCosto: number;
}

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

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioVentaOverride?: number;
}

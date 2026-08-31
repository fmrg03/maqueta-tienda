import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Material } from './material.entity';
import { VarianteMaterial } from './variante-material.entity';

@Entity('combos')
export class Combo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioCombo: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => ComboItem, (item) => item.combo, { cascade: true })
  items: ComboItem[];
}

@Entity('combo_items')
export class ComboItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Combo, (combo) => combo.items, { onDelete: 'CASCADE' })
  combo: Combo;

  // Un item de combo referencia un Material base O una VarianteMaterial
  // específica — se valida en el servicio que exactamente uno esté presente.
  @ManyToOne(() => Material, { nullable: true, eager: true })
  material?: Material;

  @ManyToOne(() => VarianteMaterial, { nullable: true, eager: true })
  variante?: VarianteMaterial;

  @Column({ type: 'int' })
  cantidad: number;
}

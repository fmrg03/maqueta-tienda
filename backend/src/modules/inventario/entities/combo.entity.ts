import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
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

  // Siempre una variante específica, nunca el Material genérico: el
  // combo lo arma la tienda y necesita saber exactamente qué presentación
  // (y a qué costo/stock) está empaquetando — a diferencia del carrito de
  // consulta del cliente, donde sí se permite dejarlo ambiguo porque
  // ventas lo aclara después por WhatsApp.
  @ManyToOne(() => VarianteMaterial, { eager: true })
  variante: VarianteMaterial;

  @Column({ type: 'int' })
  cantidad: number;
}
